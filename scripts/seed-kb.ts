/**
 * Re-index platform KB chunks for Echo RAG (kb_chunks).
 * Usage: npx tsx --tsconfig tsconfig.json scripts/seed-kb.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { pruneStaleKbChunks, seedHelpKb } from '@/lib/agents/rag/kb-rag';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const client = createClient(url, key);
  const pruned = await pruneStaleKbChunks(client);
  const result = await seedHelpKb(client);
  console.log(JSON.stringify({ pruned, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
