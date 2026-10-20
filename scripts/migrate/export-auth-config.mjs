#!/usr/bin/env node
/**
 * Export Auth config via Supabase Management API (read-only).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_… PROJECT_REF=<project-ref> \
 *     node scripts/migrate/export-auth-config.mjs
 *
 * Redacts secrets (hook secrets, etc.) but records whether they are set.
 */
import { ensureDumpDir, writeJson } from './lib.mjs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.PROJECT_REF || process.env.MIGRATE_SOURCE_PROJECT_REF;
if (!token || !ref) {
  console.error('Need SUPABASE_ACCESS_TOKEN and PROJECT_REF');
  process.exit(1);
}

const dumpDir = ensureDumpDir();

async function api(path) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

const SECRETISH = /secret|password|key|token|whsec|pass/i;

function redact(value, key = '') {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (key === 'uri_allow_list' || key.startsWith('mailer_subjects_')) {
      return value;
    }
    if (SECRETISH.test(key) || value.startsWith('v1,whsec_') || value.length > 80) {
      return value ? `[set len=${value.length}]` : '';
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v, i) => redact(v, String(i)));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  return value;
}

const INTERESTING_KEYS = [
  'site_url',
  'uri_allow_list',
  'jwt_exp',
  'refresh_token_rotation_enabled',
  'security_refresh_token_reuse_interval',
  'disable_signup',
  'external_email_enabled',
  'external_phone_enabled',
  'mailer_autoconfirm',
  'mailer_secure_email_change_enabled',
  'mailer_subjects_*',
  'mailer_templates_*',
  'smtp_*',
  'rate_limit_*',
  'mfa_*',
  'hook_*',
  'external_google_*',
  'external_apple_*',
  'external_github_*',
  'password_hibp_enabled',
  'password_min_length',
];

const raw = await api('/config/auth');
const redacted = redact(raw);

const summary = {};
for (const [k, v] of Object.entries(redacted || {})) {
  if (
    INTERESTING_KEYS.some((pat) =>
      pat.endsWith('*') ? k.startsWith(pat.slice(0, -1)) : k === pat
    ) ||
    k.startsWith('hook_') ||
    k.startsWith('mailer_') ||
    k.startsWith('rate_limit_') ||
    k.startsWith('external_') ||
    k.startsWith('mfa_') ||
    k.startsWith('smtp_')
  ) {
    summary[k] = v;
  }
}

const out = {
  generated_at: new Date().toISOString(),
  project_ref: ref,
  note: 'Secrets redacted. Re-apply values on Zurich from Dashboard or a private runbook — never commit unredacted export.',
  summary,
  full_redacted: redacted,
};

writeJson(dumpDir, `auth-config-${ref}.redacted.json`, out);
console.log(`Auth export written under ${dumpDir}/auth-config-${ref}.redacted.json`);
console.log(
  JSON.stringify(
    {
      site_url: summary.site_url,
      uri_allow_list: summary.uri_allow_list,
      hook_send_email_enabled: summary.hook_send_email_enabled,
      hook_send_email_uri: summary.hook_send_email_uri,
      external_email_enabled: summary.external_email_enabled,
      jwt_exp: summary.jwt_exp,
      disable_signup: summary.disable_signup,
    },
    null,
    2
  )
);
