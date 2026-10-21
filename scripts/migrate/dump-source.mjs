#!/usr/bin/env node
/**
 * Extract schema + data from Ireland (read-only: pg_dump / SELECT only).
 *
 * Env:
 *   MIGRATE_SOURCE_DB_URL  — session-mode pooler URI (not direct IPv6-only host)
 *   MIGRATE_DUMP_DIR       — optional output dir (default var/migrate-dumps/<iso>)
 *
 * Usage:
 *   node scripts/migrate/dump-source.mjs [--dry-run]
 *
 * Writes under the run directory:
 *   public-schema.sql   — public schema only, --no-owner, WITH grants
 *   data.dump           — custom format: all public data + selected auth tables
 *   row-counts.json     — row counts for public.* and auth.* (incl. excluded)
 */
import fs from 'node:fs';
import path from 'node:path';
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

const { dryRun, help } = parseArgs();
if (help) {
  console.log(`Usage: node scripts/migrate/dump-source.mjs [--dry-run]

Read-only against MIGRATE_SOURCE_DB_URL. Never writes to the source.
Excludes auth.sessions, auth.refresh_tokens, auth.audit_log_entries and all of storage.*
(files are copied later by copy-storage.mjs).`);
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

  // (a) public schema only, no owner, WITH ACLs (grants)
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

  // Which auth tables have rows?
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

  // (b) data: public + selected auth, custom format
  const dataArgs = [
    '--data-only',
    '--format=custom',
    '--no-owner',
    '-n',
    'public',
    ...authWithRows.flatMap((t) => ['-t', t]),
    '-f',
    dataFile,
    sourceUrl || 'postgresql://USER:***@HOST:5432/postgres',
  ];
  console.log(`Plan: data dump → ${path.basename(dataFile)} (public + ${authWithRows.length} auth tables)`);
  if (dryRun) {
    const withoutUrl = dataArgs.slice(0, -1).join(' ');
    console.log(`[dry-run] pg_dump ${withoutUrl} <masked-url>`);
  } else {
    run(tools.pg_dump.bin, dataArgs, { label: 'pg_dump data' });
  }

  // Row counts sidecar
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
  console.log(`  - row-counts.json`);
});
