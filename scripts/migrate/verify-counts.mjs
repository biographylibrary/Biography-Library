#!/usr/bin/env node
/**
 * Compare Ireland vs Zurich: row counts, catalog hashes, and per-table content
 * checksums (md5 of md5(row) ordered by primary key; skips bytea / vector cols).
 *
 * Fails at the first content or count difference.
 *
 * Usage:
 *   node scripts/migrate/verify-counts.mjs [--dry-run]
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

/** Per-table content checksums via temp table + dynamic SQL (skips bytea/vector/arrays). */
const contentChecksumPlpgsql = `
CREATE TEMP TABLE IF NOT EXISTS _verify_checksums (fq text PRIMARY KEY, checksum text, n bigint);
TRUNCATE _verify_checksums;
DO $body$
DECLARE
  r record;
  pk_cols text;
  safe_cols text;
  order_expr text;
  sql text;
  h text;
  n bigint;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, c.relname AS name, c.oid AS relid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND (
        n.nspname = 'public'
        OR (n.nspname = 'auth' AND c.relname IN ('users', 'identities'))
      )
    ORDER BY 1, 2
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
    INTO pk_cols
    FROM pg_index i
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE i.indrelid = r.relid AND i.indisprimary;

    SELECT string_agg(
             format('md5(coalesce(%I::text, ''''))', a.attname),
             ' || ''|'' || ' ORDER BY a.attnum
           )
    INTO safe_cols
    FROM pg_attribute a
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = r.relid AND a.attnum > 0 AND NOT a.attisdropped
      AND t.typname NOT IN ('bytea', 'vector')
      AND t.typcategory <> 'A';  -- skip arrays (embeddings / large)

    IF safe_cols IS NULL THEN
      safe_cols := 'md5('''')';
    END IF;

    IF pk_cols IS NOT NULL THEN
      order_expr := pk_cols;
      sql := format(
        'SELECT count(*)::bigint,
                coalesce(md5(string_agg(x, '','' ORDER BY %s)), md5(''''))
         FROM (
           SELECT (%s) AS x, %s
           FROM %I.%I
         ) s',
        pk_cols,
        safe_cols,
        pk_cols,
        r.schema,
        r.name
      );
    ELSE
      sql := format(
        'SELECT count(*)::bigint,
                coalesce(md5(string_agg(x, '','' ORDER BY x)), md5(''''))
         FROM (
           SELECT (%s) AS x
           FROM %I.%I
         ) s',
        safe_cols,
        r.schema,
        r.name
      );
    END IF;

    BEGIN
      EXECUTE sql INTO n, h;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback: count only + hash of count (surface error in checksum)
      EXECUTE format('SELECT count(*)::bigint FROM %I.%I', r.schema, r.name) INTO n;
      h := md5('ERROR:' || SQLERRM || ':n=' || n::text);
    END;

    INSERT INTO _verify_checksums(fq, checksum, n) VALUES (r.schema || '.' || r.name, h, n);
  END LOOP;
END
$body$;
SELECT coalesce(json_object_agg(fq, json_build_object('checksum', checksum, 'n', n)), '{}'::json)::text
FROM _verify_checksums;
`;

function failFirst(diffs) {
  if (!diffs.length) return;
  const d = diffs[0];
  console.error(
    `\nFIRST DIFF: kind=${d.kind} key=${d.key} source=${d.source} dest=${d.dest}\n`
  );
  process.exitCode = 1;
}

function diffMaps(a, b, label) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const rows = [];
  for (const k of [...keys].sort()) {
    const av = a?.[k] ?? null;
    const bv = b?.[k] ?? null;
    const aVal = av && typeof av === 'object' ? JSON.stringify(av) : av;
    const bVal = bv && typeof bv === 'object' ? JSON.stringify(bv) : bv;
    if (aVal !== bVal) rows.push({ kind: label, key: k, source: aVal, dest: bVal });
  }
  return rows;
}

timedSync('verify-counts', () => {
  if (dryRun) {
    console.log('[dry-run] would compare:');
    console.log('  - row counts for every public table + auth.users/identities');
    console.log('  - content checksums (md5 of md5(safe cols) ordered by PK; skip bytea/vector/arrays)');
    console.log('  - catalog counts + fn/policy definition hashes');
    console.log('  - exit 1 on first difference');
    console.log('[dry-run] storage files: node scripts/migrate/verify-storage.mjs');
    return;
  }

  const tools = assertPgTools();

  const srcPublic = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, publicCountsSql));
  const dstPublic = JSON.parse(psqlTuples(tools.psql.bin, destUrl, publicCountsSql));
  let diffs = diffMaps(srcPublic, dstPublic, 'public_rows');
  if (diffs.length) {
    printTable(diffs);
    failFirst(diffs);
    writeReport({ diffs, srcPublic, dstPublic });
    return;
  }

  const srcAuth = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, authCountsSql));
  const dstAuth = JSON.parse(psqlTuples(tools.psql.bin, destUrl, authCountsSql));
  diffs = diffMaps(srcAuth, dstAuth, 'auth_rows');
  if (diffs.length) {
    printTable(diffs);
    failFirst(diffs);
    writeReport({ diffs, srcAuth, dstAuth });
    return;
  }

  console.log('Computing content checksums (source)…');
  const srcContent = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, contentChecksumPlpgsql));
  console.log('Computing content checksums (dest)…');
  const dstContent = JSON.parse(psqlTuples(tools.psql.bin, destUrl, contentChecksumPlpgsql));
  diffs = diffMaps(srcContent, dstContent, 'content');
  if (diffs.length) {
    printTable(diffs);
    failFirst(diffs);
    writeReport({ diffs, srcContent, dstContent });
    return;
  }

  const srcCat = JSON.parse(psqlTuples(tools.psql.bin, sourceUrl, catalogSql));
  const dstCat = JSON.parse(psqlTuples(tools.psql.bin, destUrl, catalogSql));
  diffs = diffMaps(srcCat, dstCat, 'catalog');
  if (diffs.length) {
    printTable(diffs);
    failFirst(diffs);
    writeReport({ diffs, srcCat, dstCat });
    return;
  }

  console.log('');
  console.log('| kind | key | source | dest |');
  console.log('|------|-----|--------|------|');
  console.log('| (none) | — | — | — |');
  console.log('');
  console.log('OK: zero differences (counts + content checksums + catalog)');
  writeReport({
    diffs: [],
    srcPublic,
    dstPublic,
    srcAuth,
    dstAuth,
    srcContent,
    dstContent,
    srcCat,
    dstCat,
  });
  console.log('Also run: node scripts/migrate/verify-storage.mjs');
});

function printTable(diffs) {
  console.log('');
  console.log('| kind | key | source | dest |');
  console.log('|------|-----|--------|------|');
  for (const d of diffs.slice(0, 50)) {
    console.log(`| ${d.kind} | ${d.key} | ${d.source} | ${d.dest} |`);
  }
  if (diffs.length > 50) console.log(`| … | (${diffs.length - 50} more) | | |`);
}

function writeReport(extra) {
  const runDir = ensureRunDir(process.env.MIGRATE_DUMP_DIR);
  const out = path.join(runDir, 'verify-counts.json');
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        captured_at: new Date().toISOString(),
        source: maskDbUrl(sourceUrl),
        dest: maskDbUrl(destUrl),
        ...extra,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`Wrote ${out}`);
}
