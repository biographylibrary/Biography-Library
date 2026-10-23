#!/usr/bin/env node
/**
 * Copy all objects from source Storage buckets to destination (same paths).
 * Usage:
 *   MIGRATE_SOURCE_URL=… MIGRATE_SOURCE_SERVICE_KEY=…
 *   MIGRATE_DEST_URL=… MIGRATE_DEST_SERVICE_KEY=…
 *   node scripts/migrate/copy-storage.mjs [--dry-run]
 *
 * Optional: MIGRATE_BUCKETS=biography-photos,archive
 */
import { sourceClient, destClient, ensureDumpDir, writeJson, BUCKETS, requireEnv } from './lib.mjs';
import { assertSafeDest, maskDbUrl, parseArgs, timed } from './lib-db.mjs';

const { dryRun, help } = parseArgs();
if (help) {
  console.log('Usage: node scripts/migrate/copy-storage.mjs [--dry-run]');
  process.exit(0);
}

const sourceUrl = process.env.MIGRATE_SOURCE_URL || '';
const destUrl = process.env.MIGRATE_DEST_URL || '';
console.log(`Source API: ${maskDbUrl(sourceUrl)}`);
console.log(`Dest API:   ${maskDbUrl(destUrl)}`);

const buckets = (process.env.MIGRATE_BUCKETS || BUCKETS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await timed('copy-storage', async () => {
  if (dryRun) {
    if (destUrl) {
      try {
        assertSafeDest(destUrl, sourceUrl);
        console.log('Dest host guards: OK');
      } catch (e) {
        console.warn(`Dest host guards: ${e.message}`);
      }
    } else {
      console.log('[dry-run] would require MIGRATE_DEST_URL containing frycyhvhuifznxzamenn');
    }
    console.log(`[dry-run] would copy buckets: ${buckets.join(', ')}`);
    console.log('[dry-run] no upload to destination');
    return;
  }

  requireEnv('MIGRATE_SOURCE_URL');
  requireEnv('MIGRATE_DEST_URL');
  assertSafeDest(destUrl, sourceUrl);

  const source = sourceClient();
  const dest = destClient();
  const dumpDir = ensureDumpDir();

  async function listAll(client, bucket) {
    const out = [];
    async function walk(prefix = '') {
      const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) throw new Error(`${bucket} list ${prefix}: ${error.message}`);
      for (const item of data ?? []) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) out.push(full);
        else await walk(full);
      }
    }
    await walk('');
    return out;
  }

  const log = { started_at: new Date().toISOString(), buckets: {}, errors: [] };

  for (const bucket of buckets) {
    console.log(`Listing ${bucket}…`);
    const names = await listAll(source, bucket);
    log.buckets[bucket] = { total: names.length, copied: 0, skipped: 0, failed: [] };

    for (const name of names) {
      try {
        const { data: blob, error: dlErr } = await source.storage.from(bucket).download(name);
        if (dlErr || !blob) throw new Error(dlErr?.message || 'download empty');

        const buffer = Buffer.from(await blob.arrayBuffer());
        const contentType = blob.type || undefined;

        const { error: upErr } = await dest.storage.from(bucket).upload(name, buffer, {
          upsert: true,
          contentType,
        });
        if (upErr) throw new Error(upErr.message);

        log.buckets[bucket].copied += 1;
        if (log.buckets[bucket].copied % 20 === 0) {
          console.log(`  ${bucket}: ${log.buckets[bucket].copied}/${names.length}`);
        }
      } catch (e) {
        const msg = String(e.message || e);
        log.buckets[bucket].failed.push({ name, error: msg });
        log.errors.push({ bucket, name, error: msg });
        console.error(`FAIL ${bucket}/${name}: ${msg}`);
      }
    }
  }

  log.finished_at = new Date().toISOString();
  writeJson(dumpDir, 'copy-storage-log.json', log);

  const failed = log.errors.length;
  console.log(failed ? `Done with ${failed} failures` : 'Done OK');
  if (failed) process.exitCode = 1;
});
