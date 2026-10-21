#!/usr/bin/env node
/**
 * Extract schema + data from Ireland (read-only: pg_dump / SELECT only).
 *
 * Env:
 *   MIGRATE_SOURCE_DB_URL  — session-mode pooler URI
 *   MIGRATE_DUMP_DIR       — optional output dir
 *
 * Usage:
 *   node scripts/migrate/dump-source.mjs [--dry-run]
 *
 * Writes:
 *   public-schema.sql
 *   data.dump          — custom: -t 'public.*' + AUTH_DATA_TABLES (with rows)
 *   row-counts.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  AUTH_DATA_TABLES,
  AUTH_EXCLUDED_TABLES,
  assertLooksLikeSource,
  assertPgTools,
  ensureRunDir,
  maskDbUrl,
  parseArgs,
  psqlTuples,
  requireEnv,
  run,
  timedSync,
} from './lib-db.mjs';

/** Parse pg_restore -l listing; count TABLE DATA lines per schema. */
export function countTableDataBySchema(listText) {
  const bySchema = { public: 0, auth: 0, other: 0 };
  const tables = { public: [], auth: [], other: [] };
  for (const line of String(listText).split('\n')) {
    // e.g. "123; 0 0 TABLE DATA public profiles postgres"
    const m = line.match(/TABLE DATA\s+(\S+)\s+(\S+)\s+/);
    if (!m) continue;
    const schema = m[1];
    const table = m[2];
    if (schema === 'public') {
      bySchema.public += 1;
      tables.public.push(table);
    } else if (schema === 'auth') {
      bySchema.auth += 1;
      tables.auth.push(table);
    } else {
      bySchema.other += 1;
      tables.other.push(`${schema}.${table}`);
    }
  }
  return { bySchema, tables };
}

export function assertPublicDataPresent(listText, minPublic = 1) {
  const { bySchema, tables } = countTableDataBySchema(listText);
  console.log(
    `pg_restore --list TABLE DATA: public=${bySchema.public}, auth=${bySchema.auth}, other=${bySchema.other}`
  );
  if (bySchema.public < minPublic) {
    throw new Error(
      `data.dump missing public TABLE DATA (found ${bySchema.public}). ` +
        `Dump flags must use -t 'public.*' (not -n public with -t auth.*).`
    );
  }
  return { bySchema, tables };
}

function main() {
  const { dryRun, help } = parseArgs();
  if (help) {
    console.log(`Usage: node scripts/migrate/dump-source.mjs [--dry-run]

Read-only against MIGRATE_SOURCE_DB_URL. Never writes to the source.
Data dump uses -t 'public.*' plus selected auth tables (never -n with -t).
Excludes auth.sessions, auth.refresh_tokens, auth.audit_log_entries and storage.*.`);
    process.exit(0);
  }

  const sourceUrl = dryRun
    ? process.env.MIGRATE_SOURCE_DB_URL || ''
    : requireEnv('MIGRATE_SOURCE_DB_URL');

  if (sourceUrl) assertLooksLikeSource(sourceUrl);
  console.log(`Source: ${maskDbUrl(sourceUrl)}`);

  const tools = dryRun ? null : assertPgTools();
  const runDir = ensureRunDir();
  console.log(`Run dir: ${runDir}`);

  timedSync('dump-source', () => {
    const schemaFile = path.join(runDir, 'public-schema.sql');
    const dataFile = path.join(runDir, 'data.dump');
    const countsFile = path.join(runDir, 'row-counts.json');
    const listFile = path.join(runDir, 'data.dump.list.txt');

    const schemaArgs = [
      '--schema=public',
      '--schema-only',
      '--no-owner',
      '--no-comments',
      '-f',
      schemaFile,
      sourceUrl || 'postgresql://USER:***@HOST:5432/postgres',
    ];
    console.log('Plan: public schema dump (WITH grants, --no-owner)');
    if (dryRun) {
      console.log(`[dry-run] pg_dump ${schemaArgs.slice(0, -1).join(' ')} <masked-url>`);
    } else {
      run(tools.pg_dump.bin, schemaArgs, { label: 'pg_dump schema' });
    }

    let authWithRows = [...AUTH_DATA_TABLES];
    if (!dryRun) {
      authWithRows = [];
      for (const table of AUTH_DATA_TABLES) {
        const n = Number(psqlTuples(tools.psql.bin, sourceUrl, `select count(*)::text from ${table}`));
        console.log(`  ${table}: ${n} rows`);
        if (n > 0) authWithRows.push(table);
      }
    } else {
      console.log('[dry-run] would count rows in auth candidate tables and dump those with n>0');
      console.log(`[dry-run] candidates: ${AUTH_DATA_TABLES.join(', ')}`);
      console.log(`[dry-run] always excluded: ${AUTH_EXCLUDED_TABLES.join(', ')}`);
    }

    // Single custom dump: public.* via -t pattern + auth tables (no -n — it would be ignored by -t)
    const dataArgs = [
      '--data-only',
      '--format=custom',
      '--no-owner',
      '-t',
      'public.*',
      ...authWithRows.flatMap((t) => ['-t', t]),
      '-f',
      dataFile,
      sourceUrl || 'postgresql://USER:***@HOST:5432/postgres',
    ];
    console.log(
      `Plan: data.dump with -t 'public.*' + ${authWithRows.length} auth tables (no -n)`
    );
    if (dryRun) {
      console.log(`[dry-run] pg_dump ${dataArgs.slice(0, -1).join(' ')} <masked-url>`);
      console.log('[dry-run] pg_restore --list data.dump → require TABLE DATA public ≥ 1');
    } else {
      run(tools.pg_dump.bin, dataArgs, { label: 'pg_dump data' });
      const list = run(tools.pg_restore.bin, ['--list', dataFile], { label: 'pg_restore --list' });
      fs.writeFileSync(listFile, list.stdout || '', 'utf8');
      const checked = assertPublicDataPresent(list.stdout || '');
      console.log(
        `  public tables in dump: ${checked.tables.public.slice(0, 12).join(', ')}${checked.tables.public.length > 12 ? '…' : ''}`
      );
      console.log(`  auth tables in dump: ${checked.tables.auth.join(', ') || '(none)'}`);
    }

    const countsSql = `
select json_build_object(
  'captured_at', now(),
  'public', (select coalesce(json_object_agg(relname, n), '{}'::json)
             from (
               select c.relname, (xpath('//row/c/text()', query_to_xml(format('select count(*)::text as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint as n
               from pg_class c
               join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relkind = 'r'
               order by 1
             ) s),
  'auth', (select coalesce(json_object_agg(t, n), '{}'::json)
           from (
             select 'users' as t, count(*)::bigint as n from auth.users
             union all select 'identities', count(*)::bigint from auth.identities
             union all select 'sessions', count(*)::bigint from auth.sessions
             union all select 'refresh_tokens', count(*)::bigint from auth.refresh_tokens
             union all select 'audit_log_entries', count(*)::bigint from auth.audit_log_entries
             union all select 'mfa_factors', count(*)::bigint from auth.mfa_factors
             union all select 'mfa_challenges', count(*)::bigint from auth.mfa_challenges
             union all select 'mfa_amr_claims', count(*)::bigint from auth.mfa_amr_claims
             union all select 'flow_state', count(*)::bigint from auth.flow_state
             union all select 'one_time_tokens', count(*)::bigint from auth.one_time_tokens
           ) a),
  'dumped_auth_tables', ${JSON.stringify(authWithRows)}::json,
  'excluded_auth_tables', ${JSON.stringify(AUTH_EXCLUDED_TABLES)}::json
)::text`;

    if (dryRun) {
      console.log(`[dry-run] would write ${countsFile} via psql counts query`);
      fs.writeFileSync(
        countsFile,
        JSON.stringify(
          {
            dry_run: true,
            note: 'Counts not collected; run without --dry-run with MIGRATE_SOURCE_DB_URL',
            dumped_auth_tables: AUTH_DATA_TABLES,
            excluded_auth_tables: AUTH_EXCLUDED_TABLES,
          },
          null,
          2
        ) + '\n'
      );
    } else {
      const raw = psqlTuples(tools.psql.bin, sourceUrl, countsSql);
      fs.writeFileSync(countsFile, JSON.stringify(JSON.parse(raw), null, 2) + '\n');
      console.log(`Wrote ${countsFile}`);
    }

    console.log(`Artifacts in ${runDir}:`);
    console.log(`  - public-schema.sql`);
    console.log(`  - data.dump`);
    console.log(`  - data.dump.list.txt (when not dry-run)`);
    console.log(`  - row-counts.json`);
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
