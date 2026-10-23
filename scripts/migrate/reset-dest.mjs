#!/usr/bin/env node
/**
 * Reset Zurich to empty so Part B can be re-run from apply-baseline.
 * WRITES to destination — guarded (Zurich only, --apply required).
 *
 * Usage:
 *   node scripts/migrate/reset-dest.mjs --dry-run
 *   node scripts/migrate/reset-dest.mjs --apply
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertPgTools,
  assertSafeDest,
  maskDbUrl,
  parseArgs,
  requireEnv,
  run,
  timedSync,
} from './lib-db.mjs';

/** Buckets / policies created by build-baseline.mjs */
export const BASELINE_STORAGE_BUCKETS = ['archive', 'biography-exports', 'biography-photos'];
export const BASELINE_STORAGE_POLICIES = [
  'Public read biography exports',
  'Users can delete own files',
  'Users can read own files',
];

/**
 * SQL that empties Zurich after a Part B trial (idempotent where possible).
 * Recreates empty public with standard Supabase grants for postgres/anon/authenticated/service_role.
 */
export function buildResetDestSql({
  buckets = BASELINE_STORAGE_BUCKETS,
  policies = BASELINE_STORAGE_POLICIES,
} = {}) {
  const dropPolicies = policies
    .map((name) => `DROP POLICY IF EXISTS "${name.replace(/"/g, '""')}" ON storage.objects;`)
    .join('\n');
  const bucketList = buckets.map((b) => `'${b.replace(/'/g, "''")}'`).join(', ');

  return `
-- reset-dest.mjs — Zurich only; do not commit credentials
SET session_replication_role = replica;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO postgres, anon, authenticated, service_role;

TRUNCATE TABLE auth.users CASCADE;

${dropPolicies}
DELETE FROM storage.objects WHERE bucket_id IN (${bucketList});
DELETE FROM storage.buckets WHERE id IN (${bucketList});

DO $x$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
  ) THEN
    EXECUTE 'TRUNCATE TABLE supabase_migrations.schema_migrations';
  END IF;
END
$x$;

DROP EXTENSION IF EXISTS vector CASCADE;

SET session_replication_role = origin;
`.trim() + '\n';
}

function main() {
  const { dryRun, help, flags } = parseArgs();
  const apply = flags.has('apply');
  const effectiveDryRun = dryRun || !apply;

  if (help) {
    console.log(`Usage:
  node scripts/migrate/reset-dest.mjs --dry-run
  node scripts/migrate/reset-dest.mjs --apply

Empties Zurich (public schema, auth.users, baseline storage, migrations row, vector).
Requires --apply. Aborts if dest is not Zurich.`);
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

  const sql = buildResetDestSql();

  timedSync('reset-dest', () => {
    console.log('Plan:');
    console.log('  1. assertSafeDest (Zurich only)');
    console.log('  2. DROP TRIGGER on_auth_user_created');
    console.log('  3. DROP SCHEMA public CASCADE + CREATE SCHEMA public + standard grants');
    console.log('  4. TRUNCATE auth.users CASCADE');
    console.log('  5. Drop baseline storage policies/buckets (+ objects)');
    console.log('  6. TRUNCATE supabase_migrations.schema_migrations (if present)');
    console.log('  7. DROP EXTENSION vector CASCADE');
    console.log('  Apply: psql -1 -v ON_ERROR_STOP=1 -c <sql>');

    if (effectiveDryRun) {
      console.log('[dry-run] no write to destination');
      console.log(`[dry-run] SQL bytes: ${sql.length}`);
      console.log(`[dry-run] buckets: ${BASELINE_STORAGE_BUCKETS.join(', ')}`);
      return;
    }

    const tools = assertPgTools();
    run(
      tools.psql.bin,
      ['-1', '-v', 'ON_ERROR_STOP=1', '-c', sql, destUrl],
      { label: 'reset Zurich' }
    );
    console.log('Zurich reset. Re-run apply-baseline → restore-dest → verify-counts.');
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
