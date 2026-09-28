/**
 * Read-only. Counts biographies whose generated record card would fail,
 * and how many required facts are still UNKNOWN.
 * Does not write. Usage: npx tsx --tsconfig tsconfig.json scripts/record-schema-audit.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { assertRecordComplete, buildRecordCard } from '@/lib/record-schema';
import type {
  PermanenceExportBiography,
  PermanenceExportEvent,
  PermanenceExportRelation,
} from '@/lib/permanence-text-export';

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
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
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing database credentials in .env.local');
    process.exit(1);
  }
  const client = createClient(url, key);
  const [{ data: bios, error }, { data: events }, { data: relations }] = await Promise.all([
    client.from('biographies').select('id, um_id, schema_version, record_language_tag, record_script, record_direction, record_language_endonym, name_as_written, name_romanized, title, author_name, subject_name, biography_type, published_at, published_um_year, rights_statement_uri'),
    client.from('person_events').select('*'),
    client.from('person_relations').select('biography_id, relation_code, relation_label, related_name_as_written'),
  ]);
  if (error) throw new Error(error.message);

  const eventsByBio = new Map<string, PermanenceExportEvent[]>();
  for (const row of events ?? []) {
    const id = String((row as { biography_id: string }).biography_id);
    const list = eventsByBio.get(id) ?? [];
    list.push(row as PermanenceExportEvent);
    eventsByBio.set(id, list);
  }
  const relationsByBio = new Map<string, PermanenceExportRelation[]>();
  for (const row of relations ?? []) {
    const id = String((row as { biography_id: string }).biography_id);
    const list = relationsByBio.get(id) ?? [];
    list.push(row as PermanenceExportRelation);
    relationsByBio.set(id, list);
  }

  let invalid = 0;
  let unknownName = 0;
  let unknownBirth = 0;
  const failures: { id: string; row: string }[] = [];

  for (const raw of bios ?? []) {
    const row = raw as Record<string, unknown>;
    const id = String(row.id);
    const published = row.published_at ? String(row.published_at).slice(0, 10) : null;
    const bio: PermanenceExportBiography = {
      um_id: (row.um_id as string | null) ?? null,
      schema_version: (row.schema_version as number | null) ?? null,
      record_language_tag: (row.record_language_tag as string | null) ?? null,
      record_script: (row.record_script as string | null) ?? null,
      record_direction: (row.record_direction as string | null) ?? null,
      record_language_endonym: (row.record_language_endonym as string | null) ?? null,
      name_as_written: (row.name_as_written as string | null) ?? null,
      name_romanized: (row.name_romanized as string | null) ?? null,
      title: String(row.title ?? ''),
      author_name: (row.author_name as string | null) ?? null,
      subject_name: (row.subject_name as string | null) ?? null,
      biography_type: (row.biography_type as string | null) ?? null,
      published_at_iso: published,
      published_um_year: (row.published_um_year as number | null) ?? null,
      rights_statement_uri: (row.rights_statement_uri as string | null) ?? null,
    };
    try {
      const card = buildRecordCard(bio, eventsByBio.get(id) ?? [], relationsByBio.get(id) ?? []);
      assertRecordComplete(card.rows);
      if ((card.data.name ?? '').includes('UNKNOWN')) unknownName += 1;
      if ((card.data.birthDate ?? '').includes('UNKNOWN')) unknownBirth += 1;
    } catch (err) {
      invalid += 1;
      failures.push({ id, row: err instanceof Error ? err.message : 'invalid' });
    }
  }

  console.log(JSON.stringify({
    biographies: (bios ?? []).length,
    invalid,
    unknownName,
    unknownBirth,
    failures: failures.slice(0, 30),
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'audit failed');
  process.exit(1);
});
