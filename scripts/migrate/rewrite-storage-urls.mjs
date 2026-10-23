#!/usr/bin/env node
/**
 * Rewrite stored Supabase Storage/public URLs Ireland → Zurich (or reverse).
 * WRITES to destination — guarded (Zurich only, --apply required).
 *
 * Columns:
 *   public.biography_media.file_url
 *   public.biographies.export_txt_url, export_docx_url, final_pdf_url, listing_cover_url
 *
 * Usage:
 *   node scripts/migrate/rewrite-storage-urls.mjs --dry-run
 *   node scripts/migrate/rewrite-storage-urls.mjs --apply
 *   node scripts/migrate/rewrite-storage-urls.mjs --apply --reverse
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEST_PROJECT_REF,
  SOURCE_PROJECT_REF,
  assertPgTools,
  assertSafeDest,
  maskDbUrl,
  parseArgs,
  psqlTuples,
  requireEnv,
  run,
  timedSync,
} from './lib-db.mjs';

export const IRELAND_HOST = `${SOURCE_PROJECT_REF}.supabase.co`;
export const ZURICH_HOST = `${DEST_PROJECT_REF}.supabase.co`;

/** @type {{ table: string, column: string, label: string }[]} */
export const URL_COLUMNS = [
  { table: 'biography_media', column: 'file_url', label: 'media.file_url' },
  { table: 'biographies', column: 'export_txt_url', label: 'biographies.export_txt_url' },
  { table: 'biographies', column: 'export_docx_url', label: 'biographies.export_docx_url' },
  { table: 'biographies', column: 'final_pdf_url', label: 'biographies.final_pdf_url' },
  { table: 'biographies', column: 'listing_cover_url', label: 'biographies.listing_cover_url' },
];

export function hostPair({ reverse = false } = {}) {
  if (reverse) {
    return { fromHost: ZURICH_HOST, toHost: IRELAND_HOST, direction: 'zurich→ireland' };
  }
  return { fromHost: IRELAND_HOST, toHost: ZURICH_HOST, direction: 'ireland→zurich' };
}

/** SQL that rewrites all URL columns in one transaction (caller uses psql -1). */
export function buildRewriteSql({ reverse = false } = {}) {
  const { fromHost, toHost } = hostPair({ reverse });
  const fromLit = fromHost.replace(/'/g, "''");
  const toLit = toHost.replace(/'/g, "''");
  const updates = URL_COLUMNS.map(
    ({ table, column }) =>
      `UPDATE public.${table}
SET ${column} = replace(${column}, '${fromLit}', '${toLit}')
WHERE ${column} IS NOT NULL AND ${column} LIKE '%${fromLit}%';`
  );
  return `BEGIN;\n${updates.join('\n')}\nCOMMIT;\n`;
}

export function countHostSql(host) {
  const hostLit = host.replace(/'/g, "''");
  const fields = URL_COLUMNS.map(
    ({ table, column, label }) =>
      `'${label}', (SELECT count(*)::bigint FROM public.${table} WHERE ${column} IS NOT NULL AND ${column} LIKE '%${hostLit}%')`
  );
  return `SELECT json_build_object(${fields.join(', ')})::text`;
}

/** Fail if any tracked column still has the forbidden host. */
export function assertNoHostRemaining(counts, forbiddenHost, label) {
  const leftover = Object.entries(counts || {}).filter(([, n]) => Number(n) > 0);
  if (leftover.length) {
    const detail = leftover.map(([k, n]) => `${k}=${n}`).join(', ');
    throw new Error(
      `rewrite-storage-urls: after ${label}, rows still contain ${forbiddenHost}: ${detail}`
    );
  }
}

function printCounts(title, ireland, zurich) {
  console.log(title);
  console.log('| column | ireland | zurich |');
  console.log('|--------|---------|--------|');
  for (const { label } of URL_COLUMNS) {
    console.log(
      `| ${label} | ${ireland?.[label] ?? 0} | ${zurich?.[label] ?? 0} |`
    );
  }
}

function main() {
  const { dryRun, help, flags } = parseArgs();
  const apply = flags.has('apply');
  const reverse = flags.has('reverse');
  const effectiveDryRun = dryRun || !apply;

  if (help) {
    console.log(`Usage:
  node scripts/migrate/rewrite-storage-urls.mjs --dry-run
  node scripts/migrate/rewrite-storage-urls.mjs --apply
  node scripts/migrate/rewrite-storage-urls.mjs --apply --reverse

Rewrites Storage/public URL hosts on Zurich (MIGRATE_DEST_DB_URL).
Default: ${IRELAND_HOST} → ${ZURICH_HOST}
--reverse: ${ZURICH_HOST} → ${IRELAND_HOST}`);
    process.exit(0);
  }

  const sourceUrl = process.env.MIGRATE_SOURCE_DB_URL || '';
  const destUrl = effectiveDryRun
    ? process.env.MIGRATE_DEST_DB_URL || ''
    : requireEnv('MIGRATE_DEST_DB_URL');

  console.log(`Source: ${maskDbUrl(sourceUrl)}`);
  console.log(`Dest:   ${maskDbUrl(destUrl)}`);

  if (destUrl) {
    try {
      assertSafeDest(destUrl, sourceUrl);
      console.log('Dest host guards: OK');
    } catch (e) {
      console.error(String(e.message || e));
      process.exit(1);
    }
  } else if (!effectiveDryRun) {
    console.error('Missing MIGRATE_DEST_DB_URL');
    process.exit(1);
  } else {
    console.log(
      '[dry-run] MIGRATE_DEST_DB_URL unset — would still enforce Zurich host guards before write'
    );
  }

  const { fromHost, toHost, direction } = hostPair({ reverse });
  const sql = buildRewriteSql({ reverse });

  timedSync('rewrite-storage-urls', () => {
    console.log(`Plan: replace ${fromHost} → ${toHost} (${direction})`);
    console.log('  Columns:', URL_COLUMNS.map((c) => c.label).join(', '));
    console.log('  Apply: psql -1 -v ON_ERROR_STOP=1 -c <sql>');

    if (effectiveDryRun) {
      console.log('[dry-run] no write to destination');
      console.log(`[dry-run] SQL bytes: ${sql.length}`);
      return;
    }

    const tools = assertPgTools();
    const beforeIreland = JSON.parse(
      psqlTuples(tools.psql.bin, destUrl, countHostSql(IRELAND_HOST))
    );
    const beforeZurich = JSON.parse(
      psqlTuples(tools.psql.bin, destUrl, countHostSql(ZURICH_HOST))
    );
    printCounts('BEFORE', beforeIreland, beforeZurich);

    run(
      tools.psql.bin,
      ['-1', '-v', 'ON_ERROR_STOP=1', '-c', sql, destUrl],
      { label: 'rewrite storage URLs' }
    );

    const afterIreland = JSON.parse(
      psqlTuples(tools.psql.bin, destUrl, countHostSql(IRELAND_HOST))
    );
    const afterZurich = JSON.parse(
      psqlTuples(tools.psql.bin, destUrl, countHostSql(ZURICH_HOST))
    );
    printCounts('AFTER', afterIreland, afterZurich);

    if (reverse) {
      assertNoHostRemaining(afterZurich, ZURICH_HOST, '--reverse');
    } else {
      assertNoHostRemaining(afterIreland, IRELAND_HOST, 'ireland→zurich');
    }

    console.log('URL rewrite finished.');
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
