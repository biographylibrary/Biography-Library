#!/usr/bin/env node
/**
 * Compare Ireland vs Zurich: row counts (public + auth.users/identities),
 * and catalog counts/hashes for functions, triggers, policies, indexes, constraints.
 *
 * Env:
 *   MIGRATE_SOURCE_DB_URL
 *   MIGRATE_DEST_DB_URL
 *   MIGRATE_DUMP_DIR  — optional, writes verify-counts.json
 *
 * Usage:
 *   node scripts/migrate/verify-counts.mjs [--dry-run]
 *
 * Storage file verify: reuse verify-storage.mjs (API keys).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  assertLooksLikeSource,
  assertPgTools,
  assertSafeDest,
  ensureRunDir,
  maskDbUrl,
  parseArgs,
  psqlTuples,
  requireEnv,
  timedSync,
} from './lib-db.mjs';

const { dryRun, help } = parseArgs();
if (help) {
  console.log('Usage: node scripts/migrate/verify-counts.mjs [--dry-run]');
  process.exit(0);
}

const sourceUrl = dryRun
  ? process.env.MIGRATE_SOURCE_DB_URL || ''
  : requireEnv('MIGRATE_SOURCE_DB_URL');
const destUrl = dryRun
  ? process.env.MIGRATE_DEST_DB_URL || ''
  : requireEnv('MIGRATE_DEST_DB_URL');

if (sourceUrl) assertLooksLikeSource(sourceUrl);
if (destUrl) {
  try {
    assertSafeDest(destUrl, sourceUrl);
  } catch (e) {
    // verify may run before dest is ready; warn only in dry-run
    if (!dryRun) {
      console.error(String(e.message || e));
      process.exit(1);
    }
    console.warn(`[dry-run] dest guard: ${e.message}`);
  }
}

console.log(`Source: ${maskDbUrl(sourceUrl)}`);
console.log(`Dest:   ${maskDbUrl(destUrl)}`);

const catalogSql = `
select json_build_object(
  'tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'functions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
  'triggers', (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','auth')),
  'policies', (select count(*) from pg_policies where schemaname in ('public','storage')),
  'indexes', (select count(*) from pg_indexes where schemaname='public'),
  'constraints', (select count(*) from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='public'),
  'fn_hash', (select md5(string_agg(md5(pg_get_functiondef(p.oid)), ',' order by p.proname))
              from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.prokind in ('f','p')),
  'policy_hash', (select md5(string_agg(md5(coalesce(qual,'')||'|'||coalesce(with_check,'')||'|'||policyname||'|'||cmd), ',' order by schemaname, tablename, policyname))
                  from pg_policies where schemaname in ('public','storage'))
)::text
`;

const publicCountsSql = `
select coalesce(json_object_agg(relname, n), '{}'::json)::text
from (
  select c.relname,
         (xpath('//row/c/text()', query_to_xml(
           format('select count(*)::text as c from %I.%I', n.nspname, c.relname),
           false, true, ''
         )))[1]::text::bigint as n
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by 1
) s
`;

const authCountsSql = `
select json_build_object(
  'users', (select count(*)::bigint from auth.users),
  'identities', (select count(*)::bigint from auth.identities)
)::text
`;

function diffMaps(a, b, label) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const rows = [];
  for (const k of [...keys].sort()) {
    const av = a?.[k] ?? null;
    const bv = b?.[k] ?? null;
    if (av !== bv) rows.push({ kind: label, key: k, source: av, dest: bv });
  }
  return rows;
}

timedSync('verify-counts', () => {
  if (dryRun) {
    console.log('[dry-run] would compare:');
    console.log('  - row counts for every public table');
    console.log('  - auth.users / auth.identities counts');
    console.log('  - counts of functions, triggers, policies, indexes, constraints');
    console.log('  - md5 aggregates of function defs and policy quals');
    console.log('  - write verify-counts.json under MIGRATE_DUMP_DIR');
    console.log('[dry-run] storage files: node scripts/migrate/verify-storage.mjs');
    return;
  }

  const tools = assertPgTools();
  const srcPublic = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, publicCountsSql));
  const dstPublic = JSON.parse(psqlTuples(tools.psql.bin, destUrl, publicCountsSql));
  const srcAuth = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, authCountsSql));
  const dstAuth = JSON.parse(psqlTuples(tools.psql.bin, destUrl, authCountsSql));
  const srcCat = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, catalogSql));
  const dstCat = JSON.parse(psqlTuples(tools.psql.bin, destUrl, catalogSql));

  const diffs = [
    ...diffMaps(srcPublic, dstPublic, 'public_rows'),
    ...diffMaps(srcAuth, dstAuth, 'auth_rows'),
    ...diffMaps(srcCat, dstCat, 'catalog'),
  ];

  // Pretty table
  console.log('');
  console.log('| kind | key | source | dest |');
  console.log('|------|-----|--------|------|');
  if (diffs.length === 0) {
    console.log('| (none) | — | — | — |');
    console.log('');
    console.log('OK: zero differences');
  } else {
    for (const d of diffs) {
      console.log(`| ${d.kind} | ${d.key} | ${d.source} | ${d.dest} |`);
    }
    console.log('');
    console.log(`DIFFS: ${diffs.length}`);
  }

  const report = {
    captured_at: new Date().toISOString(),
    source: maskDbUrl(sourceUrl),
    dest: maskDbUrl(destUrl),
    source_public: srcPublic,
    dest_public: dstPublic,
    source_auth: srcAuth,
    dest_auth: dstAuth,
    source_catalog: srcCat,
    dest_catalog: dstCat,
    diffs,
  };
  const runDir = ensureRunDir(process.env.MIGRATE_DUMP_DIR);
  const out = path.join(runDir, 'verify-counts.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`Wrote ${out}`);
  console.log('Also run: node scripts/migrate/verify-storage.mjs');

  if (diffs.length) process.exitCode = 1;
});
