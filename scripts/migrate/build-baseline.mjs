#!/usr/bin/env node
/**
 * Build Zurich baseline SQL under var/migrate-dumps/ (never commit).
 *
 * File layout:
 *   1. First line: CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
 *   2. Other Ireland extensions
 *   3. Sanitized public-schema.sql (no bare CREATE SCHEMA public; extensions stripped)
 *   4. public.handle_new_user + qualified trigger on auth.users
 *   5. storage.buckets + policies
 *   6. supabase_migrations schema/table if missing + registration row
 *
 * Apply: psql -1 -v ON_ERROR_STOP=1 -f baseline_zurich.sql
 *   (single transaction; or: node scripts/migrate/apply-baseline.mjs --apply)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertLooksLikeSource,
  assertPgTools,
  ensureRunDir,
  maskDbUrl,
  parseArgs,
  psqlTuples,
  requireEnv,
  timedSync,
} from './lib-db.mjs';

const BASELINE_VERSION = '20261022000000';
const BASELINE_NAME = 'baseline_zurich';

/** Extensions present on Ireland (excl. plpgsql which is always available). */
export const IRELAND_EXTENSIONS = [
  { name: 'vector', schema: 'public' },
  { name: 'uuid-ossp', schema: 'extensions' },
  { name: 'pgcrypto', schema: 'extensions' },
  { name: 'pg_stat_statements', schema: 'extensions' },
];

const HANDLE_NEW_USER_SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  signup_lang text;
BEGIN
  signup_lang := LOWER(LEFT(COALESCE(NEW.raw_user_meta_data->>'language', ''), 2));
  IF signup_lang NOT IN ('en', 'it', 'fr', 'de') THEN
    signup_lang := 'en';
  END IF;

  INSERT INTO public.profiles (id, email, name, language, language_confirmed_at, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    signup_lang,
    NOW(),
    'waitlist'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
`.trim();

/** Sanitize pg_dump public schema for baseline. */
export function sanitizePublicSchema(sql) {
  let out = String(sql);
  // Bare CREATE SCHEMA public fails on managed Postgres where public exists.
  out = out.replace(
    /^\s*CREATE\s+SCHEMA\s+public\s*;/gim,
    'CREATE SCHEMA IF NOT EXISTS public;'
  );
  out = out.replace(
    /^\s*CREATE\s+SCHEMA\s+"public"\s*;/gim,
    'CREATE SCHEMA IF NOT EXISTS public;'
  );
  // Extensions are emitted at the top of our baseline; drop dump copies.
  out = out.replace(/^\s*CREATE\s+EXTENSION[\s\S]*?;\s*$/gim, '');
  out = out.replace(/^\s*COMMENT\s+ON\s+EXTENSION[\s\S]*?;\s*$/gim, '');
  // Drop ALTER DEFAULT PRIVILEGES: on Supabase, role postgres cannot change default
  // privileges FOR ROLE supabase_admin ("permission denied"). Zurich already has the
  // same public-schema default ACLs as Ireland for postgres and supabase_admin
  // (tables, functions, sequences), so replaying these from the dump is unnecessary.
  out = out.replace(/\bALTER\s+DEFAULT\s+PRIVILEGES[\s\S]*?;/gi, '');
  return out.trim() + '\n';
}

export function qualifyAuthTrigger(triggerDef) {
  let t = String(triggerDef).trim().replace(/;+\s*$/, '');
  // Ensure EXECUTE FUNCTION / PROCEDURE targets public.handle_new_user
  t = t.replace(
    /EXECUTE\s+(FUNCTION|PROCEDURE)\s+(public\.)?handle_new_user\s*\(/i,
    'EXECUTE FUNCTION public.handle_new_user('
  );
  return t;
}

/** Order extensions so vector@public is first; always include it. */
export function orderExtensions(extensions) {
  const rest = [...extensions].filter((e) => e.name !== 'vector');
  return [{ name: 'vector', schema: 'public' }, ...rest];
}

export function extensionSqlLines(extensions) {
  return orderExtensions(extensions).map((e) => {
    const quoted = e.name.includes('-') ? `"${e.name}"` : e.name;
    return `CREATE EXTENSION IF NOT EXISTS ${quoted} WITH SCHEMA ${e.schema};`;
  });
}

/** Compose full baseline SQL. First line is always vector extension. */
export function composeBaselineSql({
  extensions,
  publicSchema,
  triggerDef,
  buckets,
  policies,
  sourceUrlMasked = '',
}) {
  const extLines = extensionSqlLines(extensions);
  const parts = [];
  // (a) First line of file MUST be CREATE EXTENSION vector
  parts.push(extLines[0]);
  for (const line of extLines.slice(1)) parts.push(line);
  parts.push('');
  parts.push(`-- baseline_zurich — generated ${new Date().toISOString()}`);
  parts.push(`-- DO NOT commit. Apply: psql -1 -v ON_ERROR_STOP=1 -f baseline_zurich.sql`);
  if (sourceUrlMasked) parts.push(`-- Source (masked): ${sourceUrlMasked}`);
  parts.push('-- Single transaction via: psql -1 -v ON_ERROR_STOP=1');
  parts.push('');

  parts.push('-- ========== public schema (from pg_dump, sanitized) ==========');
  parts.push(sanitizePublicSchema(publicSchema).trimEnd());
  parts.push('');

  parts.push('-- ========== auth.users → public.handle_new_user (qualified) ==========');
  parts.push(HANDLE_NEW_USER_SQL);
  parts.push('');
  parts.push('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
  parts.push(`${qualifyAuthTrigger(triggerDef)};`);
  parts.push('');

  parts.push('-- ========== storage.buckets ==========');
  for (const b of buckets) {
    const limit = b.file_size_limit == null ? 'NULL' : String(b.file_size_limit);
    const mime =
      b.allowed_mime_types == null ? 'NULL' : `'${JSON.stringify(b.allowed_mime_types)}'::text[]`;
    parts.push(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('${b.id}', '${b.name}', ${b.public === true}, ${limit}, ${mime})
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;`);
  }
  parts.push('');

  parts.push('-- ========== storage.objects policies ==========');
  for (const p of policies) {
    const roles = String(p.roles || '{public}')
      .replace(/[{}]/g, '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const toClause = roles.length ? ` TO ${roles.join(', ')}` : '';
    const using = p.qual ? `\n  USING (${p.qual})` : '';
    const check = p.with_check ? `\n  WITH CHECK (${p.with_check})` : '';
    parts.push(`DROP POLICY IF EXISTS "${p.policyname}" ON storage.objects;`);
    parts.push(
      `CREATE POLICY "${p.policyname}" ON storage.objects\n  FOR ${p.cmd}${toClause}${using}${check};`
    );
  }
  parts.push('');

  parts.push('-- ========== migration history ==========');
  parts.push('CREATE SCHEMA IF NOT EXISTS supabase_migrations;');
  parts.push(`CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);`);
  parts.push(`INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${BASELINE_VERSION}', '${BASELINE_NAME}')
ON CONFLICT (version) DO NOTHING;`);
  parts.push('');

  const sql = parts.join('\n');
  const firstLine = sql.split('\n')[0];
  if (firstLine !== 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;') {
    throw new Error(
      `baseline first line must be CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;; got: ${firstLine}`
    );
  }
  return sql;
}

function main() {
  const { dryRun, help } = parseArgs();
  if (help) {
    console.log('Usage: MIGRATE_DUMP_DIR=… node scripts/migrate/build-baseline.mjs [--dry-run]');
    process.exit(0);
  }

  const sourceUrl = dryRun
    ? process.env.MIGRATE_SOURCE_DB_URL || ''
    : requireEnv('MIGRATE_SOURCE_DB_URL');
  if (sourceUrl) assertLooksLikeSource(sourceUrl);
  console.log(`Source: ${maskDbUrl(sourceUrl)}`);

  const runDir = ensureRunDir(process.env.MIGRATE_DUMP_DIR);
  const schemaPath = path.join(runDir, 'public-schema.sql');
  const outPath = path.join(runDir, 'baseline_zurich.sql');

  timedSync('build-baseline', () => {
    if (!dryRun && !fs.existsSync(schemaPath)) {
      throw new Error(`Missing ${schemaPath} — run dump-source.mjs first`);
    }

    const tools = dryRun ? null : assertPgTools();

    let publicSchema = '';
    if (dryRun && !fs.existsSync(schemaPath)) {
      publicSchema = '-- [dry-run] public-schema.sql would be read here\n';
    } else {
      publicSchema = fs.readFileSync(schemaPath, 'utf8');
    }

    let extensions = [...IRELAND_EXTENSIONS];
    let triggerDef =
      'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
    let buckets = [
      { id: 'archive', name: 'archive', public: false, file_size_limit: null, allowed_mime_types: null },
      {
        id: 'biography-exports',
        name: 'biography-exports',
        public: true,
        file_size_limit: null,
        allowed_mime_types: null,
      },
      {
        id: 'biography-photos',
        name: 'biography-photos',
        public: false,
        file_size_limit: 20971520,
        allowed_mime_types: null,
      },
    ];
    let policies = [
      {
        policyname: 'Public read biography exports',
        cmd: 'SELECT',
        roles: '{public}',
        qual: "(bucket_id = 'biography-exports'::text)",
        with_check: null,
      },
      {
        policyname: 'Users can delete own files',
        cmd: 'DELETE',
        roles: '{authenticated}',
        qual:
          "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
        with_check: null,
      },
      {
        policyname: 'Users can read own files',
        cmd: 'SELECT',
        roles: '{authenticated}',
        qual:
          "((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))",
        with_check: null,
      },
    ];

    if (!dryRun) {
      const extJson = psqlTuples(
        tools.psql.bin,
        sourceUrl,
        `select coalesce(json_agg(json_build_object('name', e.extname, 'schema', n.nspname) order by e.extname), '[]'::json)::text
         from pg_extension e
         join pg_namespace n on n.oid = e.extnamespace
         where e.extname not in ('plpgsql')`
      );
      const liveExt = JSON.parse(extJson);
      extensions = IRELAND_EXTENSIONS.map((want) => {
        const hit = liveExt.find((e) => e.name === want.name);
        return hit ? { name: hit.name, schema: hit.schema } : want;
      });
      for (const e of liveExt) {
        if (e.name === 'supabase_vault') continue;
        if (!extensions.some((x) => x.name === e.name)) {
          extensions.push({ name: e.name, schema: e.schema });
        }
      }

      const rawTrig = psqlTuples(
        tools.psql.bin,
        sourceUrl,
        `select pg_get_triggerdef(t.oid, true)
         from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
           and not t.tgisinternal`
      );
      if (!rawTrig) throw new Error('on_auth_user_created not found on source');
      triggerDef = qualifyAuthTrigger(rawTrig);

      buckets = JSON.parse(
        psqlTuples(
          tools.psql.bin,
          sourceUrl,
          `select coalesce(json_agg(row_to_json(b) order by name), '[]'::json)::text
           from (
             select id, name, public, file_size_limit, allowed_mime_types
             from storage.buckets
             where name in ('archive', 'biography-exports', 'biography-photos')
           ) b`
        )
      );

      policies = JSON.parse(
        psqlTuples(
          tools.psql.bin,
          sourceUrl,
          `select coalesce(json_agg(row_to_json(p) order by policyname), '[]'::json)::text
           from (
             select policyname, cmd, roles::text as roles, qual, with_check
             from pg_policies
             where schemaname = 'storage' and tablename = 'objects'
           ) p`
        )
      );
    } else {
      console.log('[dry-run] would refresh extensions/trigger/buckets/policies from source');
    }

    const orderedExt = orderExtensions(extensions);
    const sql = composeBaselineSql({
      extensions: orderedExt,
      publicSchema,
      triggerDef,
      buckets,
      policies,
      sourceUrlMasked: maskDbUrl(sourceUrl),
    });

    if (dryRun) {
      console.log(`[dry-run] would write ${outPath} (${sql.length} chars)`);
      console.log(`[dry-run] first line: ${sql.split('\n')[0]}`);
      console.log(`[dry-run] extensions: ${orderedExt.map((e) => `${e.name}@${e.schema}`).join(', ')}`);
      console.log(`[dry-run] buckets: ${buckets.map((b) => b.name).join(', ')}`);
      console.log(`[dry-run] trigger: ${triggerDef.slice(0, 100)}…`);
      console.log('[dry-run] apply: psql -1 -v ON_ERROR_STOP=1 -f baseline_zurich.sql');
    } else {
      fs.writeFileSync(outPath, sql, 'utf8');
      console.log(`Wrote ${outPath}`);
    }

    const notes = {
      extensions: orderedExt,
      auth_trigger: triggerDef,
      buckets,
      storage_policies: policies.map((p) => p.policyname),
      apply: 'psql -1 -v ON_ERROR_STOP=1 -f baseline_zurich.sql  (single transaction)',
      schema_migrations: { version: BASELINE_VERSION, name: BASELINE_NAME },
      first_line: sql.split('\n')[0],
    };
    const notesPath = path.join(runDir, 'baseline-notes.json');
    if (dryRun) {
      console.log(`[dry-run] would write ${notesPath}`);
    } else {
      fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2) + '\n');
      console.log(`Wrote ${notesPath}`);
    }
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
