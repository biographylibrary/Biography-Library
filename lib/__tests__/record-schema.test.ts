import { describe, expect, it } from 'vitest';
import { buildPermanenceHeaderLines } from '@/lib/permanence-text-export';
import {
  assertRecordComplete,
  buildRecordCard,
  RECORD_SCHEMA_VERSION,
  type RecordRow,
} from '@/lib/record-schema';
import type { PermanenceExportBiography, PermanenceExportEvent } from '@/lib/permanence-text-export';

const BIO: PermanenceExportBiography = {
  um_id: 'um0000k3nq7fx2mvp4',
  schema_version: 2,
  record_language_tag: 'en',
  record_script: 'Latn',
  record_direction: 'ltr',
  record_language_endonym: 'English',
  name_as_written: 'Maria Rossi',
  name_romanized: 'Maria Rossi',
  title: 'Maria Rossi',
  author_name: 'Maria Rossi',
  subject_name: null,
  biography_type: 'autobiography',
  published_at_iso: '2026-09-03',
  published_um_year: 0,
  rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};

const BIRTH: PermanenceExportEvent = {
  event_type: 'birth',
  event_label: 'birth',
  date_edtf: '1948-03-14',
  date_as_given: '14 March 1948',
  calendar_label: 'Gregorian',
  date_start_iso: '1948-03-14',
  date_start_jdn: 2432625,
  place_name_as_given: 'Lugano',
  place_lat: 46.0042,
  place_lon: 8.9512,
  place_geonames_id: 2659836,
  place_wikidata_qid: 'Q7024',
  asserted_by: 'family',
  asserted_by_label: 'a relative',
  confidence: 'certain',
};

describe('record schema', () => {
  it('writes a complete card in the declared order', () => {
    const card = buildRecordCard(BIO, [BIRTH], [
      { relation_code: 'child', relation_label: 'child', related_name_as_written: 'Luca' },
    ], 'https://id.biographylibrary.org');
    expect(card.version).toBe(RECORD_SCHEMA_VERSION);
    expect(card.lines[0]).toBe('BIOGRAPHY LIBRARY');
    expect(card.lines.join('\n')).toContain('IDENTIFIER: UM-0000-K3NQ-7FX2-MVP4');
    expect(card.lines.join('\n')).toContain('EVENT: birth | birth');
    const keys = card.rows.map((row) => row.key);
    expect(keys.indexOf('birthEvent')).toBeLessThan(keys.indexOf('deathEvent'));
    expect(keys.indexOf('deathSource')).toBeLessThan(keys.indexOf('residence'));
    expect(keys.indexOf('relation')).toBeLessThan(keys.indexOf('published'));
    expect(keys.indexOf('published')).toBeLessThan(keys.indexOf('rights'));
    expect(() => assertRecordComplete(card.rows)).not.toThrow();
  });

  it('stays valid when every value is unknown', () => {
    const empty: PermanenceExportBiography = {
      ...BIO,
      um_id: null,
      name_as_written: null,
      name_romanized: null,
      title: '',
      published_at_iso: null,
      published_um_year: null,
      rights_statement_uri: null,
      record_language_endonym: null,
    };
    const card = buildRecordCard(empty, [], []);
    expect(card.lines.join('\n')).toContain('UNKNOWN');
    expect(() => assertRecordComplete(card.rows)).not.toThrow();
  });

  it('rejects a card that drops a required row', () => {
    const card = buildRecordCard(BIO, [BIRTH], []);
    const broken: RecordRow[] = card.rows.filter((row) => row.key !== 'rights');
    expect(() => assertRecordComplete(broken)).toThrow(/rights/);
  });

  it('uses the same lines for the text export and the PDF header', () => {
    const lines = buildPermanenceHeaderLines(BIO, [BIRTH], []);
    expect(lines).toEqual(buildRecordCard(BIO, [BIRTH], []).lines);
  });
});
