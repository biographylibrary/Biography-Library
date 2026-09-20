import { describe, expect, it } from 'vitest';
import { buildPermanencePlainText } from '@/lib/permanence-text-export';

describe('buildPermanencePlainText', () => {
  it('emits fixed header with UNKNOWN for missing fields', () => {
    const text = buildPermanencePlainText(
      {
        um_id: 'um0000k3nq7fx2mvp4',
        schema_version: 2,
        record_language_tag: 'it',
        record_script: 'Latn',
        record_direction: 'ltr',
        record_language_endonym: 'italiano',
        name_as_written: 'Maria Rossi',
        name_romanized: null,
        title: 'Maria Rossi',
        author_name: 'Maria Rossi',
        subject_name: null,
        biography_type: 'autobiography',
        published_at_iso: '2026-09-03',
        published_um_year: 0,
        rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        content_freeflow: '<p>Una vita.</p>',
        biography_mode: 'freeflow',
      },
      [
        {
          event_type: 'birth',
          event_label: 'nascita',
          date_edtf: '1948-03-14',
          date_as_given: '14 marzo 1948',
          calendar_label: 'gregoriano',
          date_start_iso: '1948-03-14',
          date_start_jdn: 2432625,
          place_name_as_given: 'Lugano',
          place_lat: 46.0042,
          place_lon: 8.9512,
          asserted_by: 'family',
          asserted_by_label: 'un familiare',
          confidence: 'certain',
        },
      ]
    );

    expect(text).toContain('BIOGRAPHY LIBRARY');
    expect(text).toContain('UM-0000-K3NQ-7FX2-MVP4');
    expect(text).toContain('IDENTIFICATIVO | IDENTIFIER:');
    expect(text).toContain('EVENTO | EVENT: nascita | birth');
    expect(text).toContain('1948-03-14 (EDTF)');
    expect(text).toContain('2432625');
    expect(text).toContain('Lugano | 46.004200 | 8.951200');
    expect(text).toContain('EVENTO | EVENT: morte | death');
    expect(text).toContain('sconosciuto | UNKNOWN');
    expect(text).toContain('0000 UM');
    expect(text).toContain('---');
    expect(text).toContain('Una vita.');
  });

  it('puts RTL values on the next indented line', () => {
    const text = buildPermanencePlainText(
      {
        um_id: null,
        schema_version: 2,
        record_language_tag: 'ar',
        record_script: 'Arab',
        record_direction: 'rtl',
        record_language_endonym: 'العربية',
        name_as_written: 'محمد',
        name_romanized: 'Muhammad',
        title: 'محمد',
        author_name: null,
        subject_name: null,
        biography_type: 'autobiography',
        published_at_iso: null,
        published_um_year: null,
        rights_statement_uri: null,
      },
      []
    );
    expect(text).toMatch(/NAME:\n {2}محمد/);
  });
});

/** Scheda minima pubblicata, per i casi dell'indirizzo di risoluzione. */
const PUBLISHED_BIO = {
  um_id: 'um0000k3nq7fx2mvp4',
  schema_version: 2,
  record_language_tag: 'it',
  record_script: 'Latn',
  record_direction: 'ltr',
  record_language_endonym: 'italiano',
  name_as_written: 'Maria Rossi',
  name_romanized: null,
  title: 'Maria Rossi',
  author_name: 'Maria Rossi',
  subject_name: null,
  biography_type: 'autobiography',
  published_at_iso: '2026-06-26',
  published_um_year: 0,
  rights_statement_uri: null,
  content_freeflow: '<p>Una vita.</p>',
  biography_mode: 'freeflow',
} as const;

describe('indirizzo di risoluzione (spec §9)', () => {
  it('emits the dated address and the note when a base URL is given', () => {
    const text = buildPermanencePlainText(
      { ...PUBLISHED_BIO },
      [],
      [],
      undefined,
      'https://id.biographylibrary.org'
    );

    expect(text).toContain(
      'https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4 (2026-06-26 · 0000 UM)'
    );
    expect(text).toContain('INDIRIZZO DI RISOLUZIONE ALLA PUBBLICAZIONE | RESOLUTION ADDRESS');
    // La nota va nella lingua della scheda e, se diversa, anche in inglese.
    expect(text).toContain("non fa parte dell'identificativo e può cambiare");
    expect(text).toContain('is not part of the identifier and may change');
  });

  it('drops a trailing slash on the base URL', () => {
    const text = buildPermanencePlainText(
      { ...PUBLISHED_BIO },
      [],
      [],
      undefined,
      'https://id.biographylibrary.org/'
    );
    expect(text).toContain('https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4');
    expect(text).not.toContain('org//UM-');
  });

  it('emits nothing without a base URL: a working copy carries the identifier alone', () => {
    const text = buildPermanencePlainText({ ...PUBLISHED_BIO }, []);
    expect(text).toContain('UM-0000-K3NQ-7FX2-MVP4');
    expect(text).not.toContain('RESOLUTION ADDRESS');
    expect(text).not.toContain('https://id.biographylibrary.org/UM-');
  });

  it('emits nothing when the record has no publication date', () => {
    // Un indirizzo scritto al presente e non datato afferma l'opposto di quanto
    // serve, cioè che sia permanente quanto l'identificativo.
    const text = buildPermanencePlainText(
      { ...PUBLISHED_BIO, published_at_iso: null, published_um_year: null },
      [],
      [],
      undefined,
      'https://id.biographylibrary.org'
    );
    expect(text).not.toContain('RESOLUTION ADDRESS');
  });
});
