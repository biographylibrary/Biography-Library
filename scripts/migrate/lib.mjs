/**
 * Shared helpers for scripts/migrate/*.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

export function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function sourceClient() {
  const url = process.env.MIGRATE_SOURCE_URL;
  const key = process.env.MIGRATE_SOURCE_SERVICE_KEY;
  if (!url) {
    console.error('Missing env MIGRATE_SOURCE_URL');
    process.exit(1);
  }
  if (!key) {
    console.error('Missing env MIGRATE_SOURCE_SERVICE_KEY');
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function destClient() {
  const url = process.env.MIGRATE_DEST_URL;
  const key = process.env.MIGRATE_DEST_SERVICE_KEY;
  if (!url) {
    console.error('Missing env MIGRATE_DEST_URL');
    process.exit(1);
  }
  if (!key) {
    console.error('Missing env MIGRATE_DEST_SERVICE_KEY');
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Path inside bucket from a stored absolute public URL or a bare path. */
export function pathFromStoredUrl(stored, bucket) {
  if (!stored || typeof stored !== 'string') return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const marker = `/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    /* bare path */
  }
  if (trimmed.includes('://')) return null;
  return trimmed.replace(/^\//, '');
}

export function ensureDumpDir() {
  const dir =
    process.env.MIGRATE_DUMP_DIR ||
    path.join(
      process.cwd(),
      'var',
      'migrate-dumps',
      new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
    );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(dir, name, data) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${file}`);
  return file;
}

export const BUCKETS = ['biography-photos', 'biography-exports', 'archive'];
