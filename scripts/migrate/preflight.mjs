#!/usr/bin/env node
/**
 * Check pg_dump / pg_restore / psql are version 17+.
 * Usage: node scripts/migrate/preflight.mjs [--dry-run]
 */
import { parseArgs, resolvePgTools, assertPgTools, timedSync } from './lib-db.mjs';

const { dryRun, help } = parseArgs();
if (help) {
  console.log('Usage: node scripts/migrate/preflight.mjs [--dry-run]');
  process.exit(0);
}

timedSync('preflight PostgreSQL client tools', () => {
  if (dryRun) {
    console.log('[dry-run] would resolve pg_dump, pg_restore, psql and require major >= 17');
    const tools = resolvePgTools();
    for (const name of ['pg_dump', 'pg_restore', 'psql']) {
      const t = tools[name];
      console.log(
        t
          ? `  ${name}: ${t.bin} → ${t.version}${t.tooOld || t.major < 17 ? ' (too old)' : ''}`
          : `  ${name}: not found`
      );
    }
    try {
      assertPgTools(tools);
      console.log('[dry-run] preflight would PASS');
    } catch (e) {
      console.log('[dry-run] preflight would FAIL:');
      console.log(String(e.message || e));
      process.exitCode = 1;
    }
    return;
  }
  const tools = assertPgTools();
  for (const name of ['pg_dump', 'pg_restore', 'psql']) {
    console.log(`OK ${name}: ${tools[name].bin} (${tools[name].version})`);
  }
});
