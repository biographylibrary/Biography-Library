#!/usr/bin/env node
/**
 * Apply baseline_zurich.sql to Zurich in a single transaction (psql -1).
 *
 * Usage:
 *   node scripts/migrate/apply-baseline.mjs --dry-run
 *   node scripts/migrate/apply-baseline.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

function main() {
  const { dryRun, help, flags } = parseArgs();
  const apply = flags.has('apply');
  const effectiveDryRun = dryRun || !apply;

  if (help) {
    console.log('Usage: node scripts/migrate/apply-baseline.mjs [--dry-run|--apply]');
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
    } catch (e) {
      console.error(String(e.message || e));
      process.exit(1);
    }
  }

  const runDir = ensureRunDir(process.env.MIGRATE_DUMP_DIR);
  const baseline = path.join(runDir, 'baseline_zurich.sql');

  timedSync('apply-baseline', () => {
    console.log('Plan: psql -1 -v ON_ERROR_STOP=1 -f baseline_zurich.sql');
    if (effectiveDryRun) {
      console.log(
        `[dry-run] would apply ${baseline} on ${maskDbUrl(destUrl || 'MIGRATE_DEST_DB_URL')}`
      );
      return;
    }
    if (!fs.existsSync(baseline)) throw new Error(`Missing ${baseline}`);
    const tools = assertPgTools();
    run(tools.psql.bin, ['-1', '-v', 'ON_ERROR_STOP=1', '-f', baseline, destUrl], {
      label: 'apply baseline_zurich.sql',
    });
    console.log('Baseline applied.');
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
