import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, createTestDb } from './harness';
import {
  FINGERPRINT_NON_READABLE_FIELDS,
  FINGERPRINT_READABLE_FIELDS,
  NON_PUBLIC_TEXT_COLUMNS,
} from '@/lib/server/screening-public-text';
import {
  BOOK_PARTS_FOR_SCREENING,
  PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS,
} from '@/lib/server/publication-fingerprint';

/**
 * Schema dal banco PGlite di prova (bootstrap + migrazioni del harness).
 * Ogni colonna text/jsonb delle cinque tabelle dell'impronta deve essere
 * classificato: letta dallo screening, esclusa con motivo, o non pubblica.
 */
const TABLES = [
  'biographies',
  'biography_book_structure',
  'biography_media',
  'person_events',
  'person_relations',
] as const;

const FINGERPRINT_MEDIA = ['biography_media.caption', 'biography_media.layout', 'biography_media.display_order'];
const FINGERPRINT_EVENTS = [
  'person_events.event_type',
  'person_events.event_label',
  'person_events.sequence',
  'person_events.date_edtf',
  'person_events.date_as_given',
  'person_events.calendar_code',
  'person_events.place_name_as_given',
  'person_events.place_name_current',
  'person_events.source_note',
];
const FINGERPRINT_RELATIONS = [
  'person_relations.relation_code',
  'person_relations.relation_label',
  'person_relations.direction',
  'person_relations.related_um_id',
  'person_relations.related_name_as_written',
  'person_relations.related_name_romanized',
  'person_relations.valid_from_edtf',
  'person_relations.valid_to_edtf',
  'person_relations.source_note',
];

function fingerprintFieldSet(): Set<string> {
  const out = new Set<string>();
  for (const col of PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS) {
    out.add(`biographies.${col}`);
  }
  for (const [name, contentCol, enabledCol] of BOOK_PARTS_FOR_SCREENING) {
    out.add(`biography_book_structure.${contentCol}`);
    out.add(`biography_book_structure.${enabledCol}`);
    if (name === 'epigraph') out.add('biography_book_structure.epigraph_source');
  }
  for (const f of FINGERPRINT_MEDIA) out.add(f);
  for (const f of FINGERPRINT_EVENTS) out.add(f);
  for (const f of FINGERPRINT_RELATIONS) out.add(f);
  return out;
}

describe('allineamento screening ↔ impronta ↔ schema (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  }, 60_000);

  it('ogni colonna text/jsonb delle cinque tabelle è classificato', async () => {
    const rows = await as<{ table_name: string; column_name: string }>(
      db,
      'postgres',
      null,
      `select table_name, column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = any($1::text[])
         and (data_type in ('text', 'character varying', 'jsonb', 'json')
              or udt_name in ('text', 'varchar', 'jsonb', 'json'))
       order by table_name, column_name`,
      [TABLES as unknown as string[]]
    );

    const readable = new Set<string>(FINGERPRINT_READABLE_FIELDS as readonly string[]);
    const nonReadable = new Set(Object.keys(FINGERPRINT_NON_READABLE_FIELDS));
    const nonPublic = new Set(Object.keys(NON_PUBLIC_TEXT_COLUMNS));
    const fingerprint = fingerprintFieldSet();

    const unclassified: string[] = [];
    for (const row of rows) {
      const key = `${row.table_name}.${row.column_name}`;
      const inFp = fingerprint.has(key);
      if (inFp) {
        if (!readable.has(key) && !nonReadable.has(key)) {
          unclassified.push(`${key}: nell'impronta ma né leggibile né escluso`);
        }
      } else if (!nonPublic.has(key)) {
        unclassified.push(`${key}: fuori impronta senza motivo in NON_PUBLIC_TEXT_COLUMNS`);
      }
    }

    expect(unclassified, unclassified.join('\n')).toEqual([]);
  });

  it('ogni campo dell\'impronta è in FINGERPRINT_READABLE o FINGERPRINT_NON_READABLE', () => {
    const readable = new Set<string>(FINGERPRINT_READABLE_FIELDS as readonly string[]);
    const nonReadable = new Set(Object.keys(FINGERPRINT_NON_READABLE_FIELDS));
    const missing: string[] = [];
    for (const key of Array.from(fingerprintFieldSet())) {
      if (!readable.has(key) && !nonReadable.has(key)) missing.push(key);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('i campi leggibili e quelli esclusi non si sovrappongono', () => {
    for (const key of FINGERPRINT_READABLE_FIELDS) {
      expect(FINGERPRINT_NON_READABLE_FIELDS[key]).toBeUndefined();
    }
  });
});
