/**
 * Shared DB helpers for Zurich migration scripts.
 * Never log credentials; always mask passwords in printed URLs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_PROJECT_REF = 'gckmusbozgbclokvbnwx';
export const DEST_PROJECT_REF = 'frycyhvhuifznxzamenn';

export const AUTH_DATA_TABLES = [
  'auth.users',
  'auth.identities',
  'auth.mfa_factors',
  'auth.mfa_challenges',
  'auth.mfa_amr_claims',
  'auth.flow_state',
  'auth.one_time_tokens',
];

/** Never dumped (sessions invalidated at cutover). */
export const AUTH_EXCLUDED_TABLES = [
  'auth.sessions',
  'auth.refresh_tokens',
  'auth.audit_log_entries',
];

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const positionals = [];
  for (const a of argv) {
    if (a.startsWith('--')) flags.add(a.slice(2));
    else positionals.push(a);
  }
  return {
    dryRun: flags.has('dry-run'),
    help: flags.has('help') || flags.has('h'),
    flags,
    positionals,
  };
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

/** Mask password in a postgres URL for logs. */
export function maskDbUrl(url) {
  if (!url) return '(missing)';
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return String(url).replace(/:([^:@/]+)@/, ':***@');
  }
}

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Pooler URIs put the project ref in the username (postgres.<ref>), not always in the host.
 * API URLs put it in the hostname (<ref>.supabase.co). Check the whole URL with password stripped.
 */
export function urlFingerprint(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.password) u.password = '';
    return u.toString();
  } catch {
    return String(url).replace(/:([^:@/]+)@/, ':@');
  }
}

/**
 * Abort if destination is not Zurich, or is Ireland, or equals source.
 * Call before any write to MIGRATE_DEST_DB_URL / MIGRATE_DEST_URL.
 */
export function assertSafeDest(destUrl, sourceUrl) {
  const destFp = urlFingerprint(destUrl);
  const sourceFp = urlFingerprint(sourceUrl || '');

  if (!destFp.includes(DEST_PROJECT_REF)) {
    throw new Error(
      `Refusing write: destination URL must contain ${DEST_PROJECT_REF} (got ${maskDbUrl(destUrl)})`
    );
  }
  if (destFp.includes(SOURCE_PROJECT_REF)) {
    throw new Error(
      `Refusing write: destination URL contains Ireland ref ${SOURCE_PROJECT_REF}`
    );
  }
  if (sourceUrl && destUrl && destFp === sourceFp) {
    throw new Error('Refusing write: source and destination URLs are identical');
  }
}

/** Soft check that a URL looks like the Ireland project (dump source). */
export function assertLooksLikeSource(sourceUrl) {
  const fp = urlFingerprint(sourceUrl);
  if (!fp.includes(SOURCE_PROJECT_REF)) {
    console.warn(
      `Warning: source URL does not contain ${SOURCE_PROJECT_REF} (got ${maskDbUrl(sourceUrl)})`
    );
  }
}

export function timed(label, fn) {
  const t0 = Date.now();
  console.log(`[start] ${label}`);
  return Promise.resolve()
    .then(() => fn())
    .then((result) => {
      const ms = Date.now() - t0;
      console.log(`[done]  ${label} (${(ms / 1000).toFixed(2)}s)`);
      return result;
    })
    .catch((err) => {
      const ms = Date.now() - t0;
      console.error(`[fail]  ${label} after ${(ms / 1000).toFixed(2)}s`);
      throw err;
    });
}

export function timedSync(label, fn) {
  const t0 = Date.now();
  console.log(`[start] ${label}`);
  try {
    const result = fn();
    console.log(`[done]  ${label} (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
    return result;
  } catch (err) {
    console.error(`[fail]  ${label} after ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    throw err;
  }
}

function majorVersion(text) {
  const m = String(text).match(/(\d+)\./);
  return m ? Number(m[1]) : 0;
}

/** Resolve pg_dump / pg_restore / psql ≥ 17 from PATH or common install prefixes. */
export function resolvePgTools() {
  const home = process.env.HOME || '';
  const candidates = [
    '',
    home ? `${home}/.local/pgsql-17/bin/` : '',
    '/opt/homebrew/opt/postgresql@17/bin/',
    '/usr/local/opt/postgresql@17/bin/',
    '/opt/homebrew/opt/libpq/bin/',
    '/usr/local/opt/libpq/bin/',
  ].filter((p) => p !== undefined);
  const tools = {};
  for (const name of ['pg_dump', 'pg_restore', 'psql']) {
    let found = null;
    for (const prefix of candidates) {
      const bin = prefix ? `${prefix}${name}` : name;
      const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
      if (r.status === 0) {
        const ver = (r.stdout || r.stderr || '').trim();
        const major = majorVersion(ver);
        if (major >= 17) {
          found = { bin, version: ver, major };
          break;
        }
        if (!found) found = { bin, version: ver, major, tooOld: true };
      }
    }
    tools[name] = found;
  }
  return tools;
}

export function assertPgTools(tools = resolvePgTools()) {
  const missing = [];
  const old = [];
  for (const name of ['pg_dump', 'pg_restore', 'psql']) {
    const t = tools[name];
    if (!t) missing.push(name);
    else if (t.tooOld || t.major < 17) old.push(`${name} (${t.version})`);
  }
  if (missing.length || old.length) {
    const lines = [
      'PostgreSQL client tools 17+ required (source is 17.6, Zurich is 17.11).',
      missing.length ? `Missing: ${missing.join(', ')}` : null,
      old.length ? `Too old: ${old.join(', ')}` : null,
      '',
      'Install client tools ≥17 (Homebrew preferred):',
      '  brew install postgresql@17',
      '  export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"',
      'Also checked: ~/.local/pgsql-17/bin (EDB macOS binaries fallback).',
    ].filter(Boolean);
    throw new Error(lines.join('\n'));
  }
  return tools;
}

export function ensureRunDir(explicit) {
  const dir =
    explicit ||
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

export function run(bin, args, { env = process.env, dryRun = false, label = '' } = {}) {
  const printable = [bin, ...args].join(' ');
  if (dryRun) {
    console.log(`[dry-run] ${label || printable}`);
    return { status: 0, stdout: '', stderr: '' };
  }
  const r = spawnSync(bin, args, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`;
    if (/session_replication_role/i.test(err) || /must be superuser|permission denied.*replication/i.test(err)) {
      throw new Error(
        `${label || bin} failed: cannot SET session_replication_role = replica. ` +
          `The role needs permission to disable user triggers during restore ` +
          `(use the Supabase postgres role). Details: ${err}`
      );
    }
    throw new Error(`${label || bin} failed: ${err}`);
  }
  return r;
}

export function psqlTuples(psqlBin, dbUrl, sql, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] psql -At -c <sql> on ${maskDbUrl(dbUrl)}`);
    return '';
  }
  const r = run(psqlBin, ['-v', 'ON_ERROR_STOP=1', '-At', '-c', sql, dbUrl], {
    label: 'psql',
  });
  return (r.stdout || '').trim();
}
