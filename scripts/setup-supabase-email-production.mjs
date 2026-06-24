#!/usr/bin/env node
/**
 * Deploy email Edge Functions, set secrets, enable Auth Send Email hook.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/setup-supabase-email-production.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT = 'gckmusbozgbclokvbnwx';
const SITE_URL = 'https://app.biographylibrary.org';

const TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ??
  (() => {
    try {
      const mcp = JSON.parse(
        fs.readFileSync(path.join(process.env.HOME, '.cursor/mcp.json'), 'utf8'),
      );
      const args = mcp.mcpServers?.supabase?.args ?? [];
      return args.find((a) => typeof a === 'string' && a.startsWith('sbp_')) ?? null;
    } catch {
      return null;
    }
  })();

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

function readEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function rewriteIndexSource(src) {
  return src.replaceAll('../../../shared/email/', './_shared/email/');
}

function rewriteSharedSource(src) {
  return src
    .replaceAll("from './locale'", "from './locale.ts'")
    .replaceAll("from './render'", "from './render.ts'")
    .replaceAll("from './send'", "from './send.ts'")
    .replaceAll("from './types'", "from './types.ts'");
}

function sharedFiles() {
  return ['send.ts', 'render.ts', 'locale.ts', 'types.ts'].map((f) => ({
    name: `_shared/email/${f}`,
    content: rewriteSharedSource(
      fs.readFileSync(path.join(ROOT, 'shared/email', f), 'utf8'),
    ),
  }));
}

async function apiJson(method, urlPath, body) {
  const res = await fetch(`https://api.supabase.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} ${res.status}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function deployFunction(slug, indexRelPath) {
  const files = [
    {
      name: 'index.ts',
      content: rewriteIndexSource(
        fs.readFileSync(path.join(ROOT, indexRelPath), 'utf8'),
      ),
    },
    ...sharedFiles(),
  ];
  const metadata = {
    entrypoint_path: 'index.ts',
    name: slug,
    verify_jwt: false,
  };

  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  for (const file of files) {
    form.append('file', new Blob([file.content], { type: 'application/typescript' }), file.name);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT}/functions/deploy?slug=${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`deploy ${slug} ${res.status}: ${text.slice(0, 800)}`);
  }
  return JSON.parse(text);
}

function upsertEnvLocal(key, value) {
  const envPath = path.join(ROOT, '.env.local');
  let local = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  local = re.test(local) ? local.replace(re, line) : `${local.trimEnd()}\n${line}\n`;
  fs.writeFileSync(envPath, local);
}

function generateHookSecret() {
  const raw = crypto.randomBytes(32).toString('base64');
  return `v1,whsec_${raw}`;
}

const FUNCTIONS = [
  ['auth-send-email', 'supabase/functions/auth-send-email/index.ts'],
  ['user-email-confirmed', 'supabase/functions/user-email-confirmed/index.ts'],
  ['send-engagement-emails', 'supabase/functions/send-engagement-emails/index.ts'],
];

const env = readEnvLocal();
const cronSecret = env.CRON_SECRET || crypto.randomBytes(32).toString('hex');
const hookSecret = env.AUTH_HOOK_SECRET || generateHookSecret();

console.log('1/3 Deploy Edge Functions…');
for (const [slug, indexPath] of FUNCTIONS) {
  const result = await deployFunction(slug, indexPath);
  console.log(`  ✓ ${slug} v${result.version ?? '?'}`);
}

console.log('2/3 Set Edge Function secrets…');
await apiJson('POST', `/v1/projects/${PROJECT}/secrets`, [
  { name: 'RESEND_API_KEY', value: env.RESEND_API_KEY },
  { name: 'RESEND_FROM_EMAIL', value: env.RESEND_FROM_EMAIL },
  { name: 'SITE_URL', value: SITE_URL },
  { name: 'SITE_NAME', value: 'Biography Library' },
  { name: 'CRON_SECRET', value: cronSecret },
  { name: 'AUTH_HOOK_SECRET', value: hookSecret },
  { name: 'ENGAGEMENT_EMAILS_ENABLED', value: 'true' },
  { name: 'PDF_DRAFT_REMINDER_DAYS', value: '7' },
].filter((s) => s.value));
console.log('  ✓ secrets set');

console.log('3/3 Enable Auth Send Email hook…');
await apiJson('PATCH', `/v1/projects/${PROJECT}/config/auth`, {
  hook_send_email_enabled: true,
  hook_send_email_uri: `https://${PROJECT}.supabase.co/functions/v1/auth-send-email`,
  hook_send_email_secrets: hookSecret,
});
console.log('  ✓ hook enabled');

upsertEnvLocal('CRON_SECRET', cronSecret);
upsertEnvLocal('AUTH_HOOK_SECRET', hookSecret);

console.log('\nDone.');
console.log(`Hook URL: https://${PROJECT}.supabase.co/functions/v1/auth-send-email`);
console.log('CRON_SECRET and AUTH_HOOK_SECRET saved to .env.local');
console.log('Add CRON_SECRET to Jelastic for engagement cron + Next.js if needed.');
