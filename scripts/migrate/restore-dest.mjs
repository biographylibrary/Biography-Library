#!/usr/bin/env node
/**
 * Restore data.dump onto Zurich. WRITES to destination — guarded.
 *
 * Env:
 *   MIGRATE_SOURCE_DB_URL  — used only to compare hosts (must differ)
 *   MIGRATE_DEST_DB_URL    — must contain frycyhvhuifznxzamenn, never Ireland
 *   MIGRATE_DUMP_DIR       — directory with data.dump
 *
 * Usage:
 *   node scripts/migrate/restore-dest.mjs --dry-run
 *   node scripts/migrate/restore-dest.mjs --apply
 *
 * Without --apply, never writes (same as --dry-run).
 * Does NOT apply baseline_zurich.sql (schema); apply that once separately before data.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  assertPgTools,
  assertSafeDest,
  ensureRunDir,
  maskDbUrl,
  parseArgs,
  requireEnv,
  run,
  timedSync,
} from './lib-db.mjs';

const { dryRun, help, flags } = parseArgs();
const apply = flags.has('apply');
const effectiveDryRun = dryRun || !apply;

if (help) {
  console.log(`Usage:
  node scripts/migrate/restore-dest.mjs --dry-run
  node scripts/migrate/restore-dest.mjs --apply

Aborts if dest host is not Zurich, is Ireland, or equals source.`);
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

const runDir = ensureRunDir(process.env.MIGRATE_DUMP_DIR);
const dataFile = path.join(runDir, 'data.dump');

const truncateSql = `
BEGIN;
SET session_replication_role = replica;
DO $body$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE 'TRUNCATE TABLE ' || r.fq || ' CASCADE';
  END LOOP;
END
$body$;
TRUNCATE TABLE auth.users CASCADE;
COMMIT;
`;

const sequencesSql = `
DO $body$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS tbl,
           quote_ident(a.attname) AS col,
           pg_get_serial_sequence(
             quote_ident(n.nspname) || '.' || quote_ident(c.relname),
             a.attname
           ) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND pg_get_serial_sequence(
            quote_ident(n.nspname) || '.' || quote_ident(c.relname),
            a.attname
          ) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT setval(%L, coalesce((SELECT max(%s) FROM %s), 1), true)',
      r.seq, r.col, r.tbl
    );
  END LOOP;
END
$body$;
`;

timedSync('restore-dest', () => {
  if (!effectiveDryRun && !fs.existsSync(dataFile)) {
    throw new Error(`Missing ${dataFile}`);
  }

  console.log('Plan:');
  console.log('  1. assertSafeDest (Zurich only; never Ireland; != source)');
  console.log('  2. TRUNCATE all public.* CASCADE + auth.users CASCADE (triggers via session_replication_role)');
  console.log('  3. pg_restore --data-only --disable-triggers --single-transaction data.dump');
  console.log('  4. Realign sequences; ANALYZE');
  console.log('  Note: apply baseline_zurich.sql (schema) once before the first data restore.');

  if (effectiveDryRun) {
    console.log('[dry-run] no write to destination');
    console.log(
      `[dry-run] would: psql truncate → pg_restore --data-only --disable-triggers → sequences → ANALYZE on ${maskDbUrl(destUrl || 'MIGRATE_DEST_DB_URL')}`
    );
    return;
  }

  const tools = assertPgTools();

  run(tools.psql.bin, ['-v', 'ON_ERROR_STOP=1', '-c', truncateSql, destUrl], {
    label: 'truncate dest',
  });

  run(
    tools.pg_restore.bin,
    [
      '--data-only',
      '--disable-triggers',
      '--no-owner',
      '--single-transaction',
      '-d',
      destUrl,
      dataFile,
    ],
    { label: 'pg_restore data' }
  );

  run(tools.psql.bin, ['-v', 'ON_ERROR_STOP=1', '-c', sequencesSql, destUrl], {
    label: 'realign sequences',
  });

  run(tools.psql.bin, ['-v', 'ON_ERROR_STOP=1', '-c', 'ANALYZE;', destUrl], {
    label: 'ANALYZE',
  });

  console.log('Restore finished. Run verify-counts.mjs next.');
});
