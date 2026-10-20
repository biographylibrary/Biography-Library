#!/usr/bin/env node
/**
 * Bidirectional check: every object listed on source exists on dest, and vice versa.
 * Optional content check: MIGRATE_VERIFY_HASH=1 downloads both and compares SHA-256.
 *
 * Exit 1 if any mismatch.
 */
import crypto from 'node:crypto';
import { sourceClient, destClient, ensureDumpDir, writeJson, BUCKETS } from './lib.mjs';

const source = sourceClient();
const dest = destClient();
const dumpDir = ensureDumpDir();
const doHash = process.env.MIGRATE_VERIFY_HASH === '1';
const buckets = (process.env.MIGRATE_BUCKETS || BUCKETS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function listAll(client, bucket) {
  const out = [];
  async function walk(prefix = '') {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(`${bucket} list ${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        out.push({
          name: full,
          size: item.metadata?.size ?? item.metadata?.contentLength ?? null,
        });
      } else await walk(full);
    }
  }
  await walk('');
  return out;
}

async function sha256Object(client, bucket, name) {
  const { data, error } = await client.storage.from(bucket).download(name);
  if (error || !data) throw new Error(error?.message || 'empty');
  const buf = Buffer.from(await data.arrayBuffer());
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const report = {
  generated_at: new Date().toISOString(),
  hash: doHash,
  buckets: {},
  ok: true,
};

for (const bucket of buckets) {
  const srcList = await listAll(source, bucket);
  const dstList = await listAll(dest, bucket);
  const srcSet = new Map(srcList.map((o) => [o.name, o]));
  const dstSet = new Map(dstList.map((o) => [o.name, o]));

  const missingOnDest = [...srcSet.keys()].filter((n) => !dstSet.has(n));
  const missingOnSource = [...dstSet.keys()].filter((n) => !srcSet.has(n));
  const hashMismatches = [];

  if (doHash) {
    for (const name of srcSet.keys()) {
      if (!dstSet.has(name)) continue;
      try {
        const [a, b] = await Promise.all([
          sha256Object(source, bucket, name),
          sha256Object(dest, bucket, name),
        ]);
        if (a !== b) hashMismatches.push({ name, source: a, dest: b });
      } catch (e) {
        hashMismatches.push({ name, error: String(e.message || e) });
      }
    }
  }

  const bucketOk =
    missingOnDest.length === 0 && missingOnSource.length === 0 && hashMismatches.length === 0;
  if (!bucketOk) report.ok = false;

  report.buckets[bucket] = {
    source_count: srcList.length,
    dest_count: dstList.length,
    missing_on_dest: missingOnDest,
    missing_on_source: missingOnSource,
    hash_mismatches: hashMismatches,
    ok: bucketOk,
  };
  console.log(
    `${bucket}: source=${srcList.length} dest=${dstList.length} ok=${bucketOk}` +
      (missingOnDest.length ? ` missingDest=${missingOnDest.length}` : '') +
      (missingOnSource.length ? ` extraDest=${missingOnSource.length}` : '')
  );
}

writeJson(dumpDir, 'verify-storage.json', report);
process.exit(report.ok ? 0 : 1);
