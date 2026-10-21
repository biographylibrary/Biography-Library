#!/usr/bin/env node
/**
 * Build Zurich baseline SQL (written only under var/migrate-dumps/, never committed).
 *
 * Starts from public-schema.sql (from dump-source), then appends:
 *   - CREATE EXTENSION vector (if missing from the dump)
 *   - trigger on_auth_user_created (exact pg_get_triggerdef from source)
 *   - storage.buckets rows (archive, biography-exports, biography-photos)
 *   - three storage.objects policies (exact quals from pg_policies)
 *   - supabase_migrations registration 20261022000000 / baseline_zurich
 *
 * Env:
 *   MIGRATE_SOURCE_DB_URL  — to pull trigger / buckets / policies (read-only)
 *   MIGRATE_DUMP_DIR       — run directory containing public-schema.sql
 *
 * Usage:
 *   MIGRATE_DUMP_DIR=var/migrate-dumps/… node scripts/migrate/build-baseline.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
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

  const hasVectorExt =
    /create\s+extension\s+(if\s+not\s+exists\s+)?["']?vector["']?/i.test(publicSchema);

  let triggerDef =
    "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()";
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
    triggerDef = psqlTuples(
      tools.psql.bin,
      sourceUrl,
      `select pg_get_triggerdef(t.oid, true)
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
         and not t.tgisinternal`
    );
    if (!triggerDef) throw new Error('on_auth_user_created not found on source');

    const bucketJson = psqlTuples(
      tools.psql.bin,
      sourceUrl,
      `select coalesce(json_agg(row_to_json(b) order by name), '[]'::json)::text
       from (
         select id, name, public, file_size_limit, allowed_mime_types
         from storage.buckets
         where name in ('archive', 'biography-exports', 'biography-photos')
       ) b`
    );
    buckets = JSON.parse(bucketJson);

    const polJson = psqlTuples(
      tools.psql.bin,
      sourceUrl,
      `select coalesce(json_agg(row_to_json(p) order by policyname), '[]'::json)::text
       from (
         select policyname, cmd, roles::text as roles, qual, with_check
         from pg_policies
         where schemaname = 'storage' and tablename = 'objects'
       ) p`
    );
    policies = JSON.parse(polJson);
  } else {
    console.log('[dry-run] would refresh trigger/buckets/policies from source via psql');
  }

  const parts = [];
  parts.push(`-- baseline_zurich — generated ${new Date().toISOString()}`);
  parts.push(`-- DO NOT commit this file. Lives under var/migrate-dumps/ only.`);
  parts.push(`-- Source (masked): ${maskDbUrl(sourceUrl)}`);
  parts.push('');
  parts.push('-- ========== public schema (from pg_dump) ==========');
  parts.push(publicSchema.trimEnd());
  parts.push('');

  if (!hasVectorExt) {
    parts.push('-- ========== extension vector (not present in public dump) ==========');
    parts.push('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;');
    parts.push('');
  } else {
    parts.push('-- vector extension already present in public-schema dump');
    parts.push('');
  }

  parts.push('-- ========== auth.users → public.handle_new_user ==========');
  parts.push('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
  parts.push(`${triggerDef};`);
  parts.push('');

  parts.push('-- ========== storage.buckets ==========');
  for (const b of buckets) {
    const limit = b.file_size_limit == null ? 'NULL' : String(b.file_size_limit);
    const mime = b.allowed_mime_types == null ? 'NULL' : `'${JSON.stringify(b.allowed_mime_types)}'::text[]`;
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
  parts.push(`INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${BASELINE_VERSION}', '${BASELINE_NAME}')
ON CONFLICT (version) DO NOTHING;`);
  parts.push('');

  const sql = parts.join('\n');
  if (dryRun) {
    console.log(`[dry-run] would write ${outPath} (${sql.length} chars)`);
    console.log(`[dry-run] vector in dump: ${hasVectorExt}`);
    console.log(`[dry-run] buckets: ${buckets.map((b) => b.name).join(', ')}`);
    console.log(`[dry-run] policies: ${policies.map((p) => p.policyname).join(', ')}`);
    console.log(`[dry-run] trigger: ${triggerDef.slice(0, 80)}…`);
  } else {
    fs.writeFileSync(outPath, sql, 'utf8');
    console.log(`Wrote ${outPath}`);
  }

  // Sidecar notes for operators (also gitignored under migrate-dumps)
  const notes = {
    vector_in_public_dump: hasVectorExt,
    auth_trigger: triggerDef,
    buckets,
    storage_policies: policies.map((p) => p.policyname),
    outside_public_notes: [
      'Only auth trigger outside public that the app relies on: on_auth_user_created → public.handle_new_user()',
      'storage.buckets + 3 policies on storage.objects (no archive-object policies; service_role writes)',
      'No vault.secrets rows; extensions pg_stat_statements/uuid-ossp/pgcrypto live in schema extensions (platform-managed)',
      'No custom DB roles',
    ],
    schema_migrations: { version: BASELINE_VERSION, name: BASELINE_NAME },
  };
  const notesPath = path.join(runDir, 'baseline-notes.json');
  if (dryRun) {
    console.log(`[dry-run] would write ${notesPath}`);
  } else {
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2) + '\n');
    console.log(`Wrote ${notesPath}`);
  }
});
