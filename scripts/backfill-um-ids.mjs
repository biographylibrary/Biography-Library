/**
 * Backfill identificativi UM per biografie create prima del minting.
 * Uso: node --env-file=.env.local scripts/backfill-um-ids.mjs
 * Richiede SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */

import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const UM_EPOCH_YEAR = 2026;
const ALPHABET = '0123456789bcdfghjkmnpqrstvwxz';
const IDX = new Map([...ALPHABET].map((c, i) => [c, i]));
const REJECTION_THRESHOLD = 29 * 8;

function umYearFromDate(date) {
  return date.getUTCFullYear() - UM_EPOCH_YEAR;
}

function checkChar(core) {
  let sum = 0;
  for (let i = 0; i < core.length; i++) {
    sum += (i + 1) * (IDX.get(core[i]) ?? 0);
  }
  return ALPHABET[sum % 29];
}

function randomBody11() {
  const out = [];
  const buf = new Uint8Array(1);
  while (out.length < 11) {
    webcrypto.getRandomValues(buf);
    const b = buf[0];
    if (b >= REJECTION_THRESHOLD) continue;
    out.push(ALPHABET[b % 29]);
  }
  return out.join('');
}

function mintUmIdNow(now = new Date()) {
  const year = String(umYearFromDate(now)).padStart(4, '0');
  const random11 = randomBody11();
  const body = random11 + checkChar(year + random11);
  return `UM-${year}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`.toUpperCase();
}

function normalizeUmId(s) {
  return s.replace(/[-\s]/g, '').toLowerCase();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await supabase
  .from('biographies')
  .select('id, title, um_id, created_at')
  .is('um_id', null);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Found ${rows?.length ?? 0} biographies without um_id`);

let ok = 0;
for (const row of rows ?? []) {
  const issuedAt = row.created_at ? new Date(row.created_at) : new Date();
  let assigned = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const canonical = mintUmIdNow(issuedAt);
    const normalized = normalizeUmId(canonical);
    const year = umYearFromDate(issuedAt);

    const { error: regError } = await supabase.from('um_identifiers').insert({
      um_id: normalized,
      um_year: year,
      issued_at: issuedAt.toISOString(),
      biography_id: row.id,
    });
    if (regError) {
      if (regError.code === '23505') continue;
      console.error(`registry ${row.id}:`, regError.message);
      break;
    }

    const { error: bioError } = await supabase
      .from('biographies')
      .update({ um_id: normalized })
      .eq('id', row.id)
      .is('um_id', null);

    if (bioError) {
      console.error(`bio ${row.id}:`, bioError.message);
      break;
    }

    console.log(`OK ${row.title ?? row.id} → ${canonical}`);
    ok += 1;
    assigned = true;
    break;
  }
  if (!assigned) console.error(`FAILED ${row.id}`);
}

console.log(`Done: ${ok}/${rows?.length ?? 0}`);
