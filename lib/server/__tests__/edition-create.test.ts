import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEditionInsertRow,
  buildEditionTextFields,
  createEditionWithCopyStep,
  decideCreateEdition,
  isLanguageUniqueViolation,
  parseCreateEditionBody,
  type OriginalForEdition,
} from '@/lib/server/edition-create';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const baseOriginal = (): OriginalForEdition => ({
  id: 'orig-1',
  user_id: 'author-1',
  translation_of: null,
  status: 'published',
  is_frozen: false,
  biography_type: 'autobiography',
  title: 'Titolo',
  author_name: 'Anna',
  subject_name: null,
  name_as_written: 'Anna',
  name_given: null,
  name_family: null,
  name_order: null,
  name_romanized: null,
  romanization_system: null,
  biography_mode: 'freeflow',
  content: { childhood: { text: 'Infanzia', todo: false, audioTranscript: '' } },
  content_freeflow: '<h1>Capitolo</h1><p>Testo</p>',
  narrative_order: ['childhood'],
  visibility: 'public',
  rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  rights_chosen_at: '2026-01-01T00:00:00Z',
  rights_holder: 'Anna',
  consent_basis: null,
  consent_recorded_at: null,
  record_language_tag: 'it',
  revised_at: null,
  published_at: '2026-01-10T00:00:00Z',
});

describe('parseCreateEditionBody / decideCreateEdition', () => {
  it('invalid_language', () => {
    expect(parseCreateEditionBody({ originalId: 'x', languageTag: 'xx-not', startFrom: 'copy' })).toEqual({
      ok: false,
      status: 400,
      error: 'invalid_language',
    });
  });

  it('not_found', () => {
    expect(
      decideCreateEdition({ userId: 'author-1', languageTag: 'en', original: null, existingTags: [] })
    ).toEqual({ ok: false, status: 404, error: 'not_found' });
  });

  it('forbidden', () => {
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'en',
        original: { ...baseOriginal(), user_id: 'other' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 403, error: 'forbidden' });
  });

  it('original_is_edition', () => {
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'en',
        original: { ...baseOriginal(), translation_of: 'root' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'original_is_edition' });
  });

  it('frozen', () => {
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'en',
        original: { ...baseOriginal(), is_frozen: true },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'frozen' });
  });

  it('original_not_published', () => {
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'en',
        original: { ...baseOriginal(), status: 'draft' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'original_not_published' });
  });

  it('language_already_present (edizione o originale)', () => {
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'en',
        original: baseOriginal(),
        existingTags: ['en'],
      })
    ).toEqual({ ok: false, status: 409, error: 'language_already_present' });
    expect(
      decideCreateEdition({
        userId: 'author-1',
        languageTag: 'it',
        original: baseOriginal(),
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'language_already_present' });
  });
});

describe('buildEditionInsertRow', () => {
  it('non assegna um_id né Pioniere; original_version_at da published_at', () => {
    const row = buildEditionInsertRow({
      userId: 'author-1',
      original: baseOriginal(),
      language: { tag: 'en', script: 'Latn', direction: 'ltr', endonym: 'English' },
      startFrom: 'copy',
    });
    expect(row.um_id).toBeUndefined();
    expect(row.is_pioneer).toBeUndefined();
    expect(row.provisional_until).toBeUndefined();
    expect(row.next_chapter_available_at).toBeUndefined();
    expect(row.chapters_count).toBeUndefined();
    expect(row.translation_of).toBe('orig-1');
    expect(row.status).toBe('draft');
    expect(row.schema_version).toBe(2);
    expect(row.original_version_at).toBe('2026-01-10T00:00:00Z');
    expect(row.content_freeflow).toContain('Testo');
  });

  it('original_version_at da revised_at se presente', () => {
    const row = buildEditionInsertRow({
      userId: 'author-1',
      original: { ...baseOriginal(), revised_at: '2026-03-01T00:00:00Z' },
      language: { tag: 'en', script: 'Latn', direction: 'ltr', endonym: 'English' },
      startFrom: 'blank',
    });
    expect(row.original_version_at).toBe('2026-03-01T00:00:00Z');
    const text = buildEditionTextFields(baseOriginal(), 'blank');
    expect(text.content_freeflow).toContain('<h1>');
    expect(text.content_freeflow).not.toContain('Testo');
  });
});

describe('isLanguageUniqueViolation', () => {
  it('riconosce l\'indice', () => {
    expect(isLanguageUniqueViolation('duplicate key value violates unique constraint "biographies_one_language_per_work"')).toBe(
      true
    );
  });
});

describe('createEditionWithCopyStep: annullamento se la copia fallisce', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = createFakeDb({
      biographies: [
        {
          id: 'orig-1',
          user_id: 'author-1',
          translation_of: null,
          status: 'published',
          is_frozen: false,
          biography_type: 'autobiography',
          title: 'T',
          author_name: 'A',
          subject_name: null,
          name_as_written: 'A',
          biography_mode: 'freeflow',
          content: {},
          content_freeflow: '<p>x</p>',
          narrative_order: [],
          visibility: 'public',
          rights_statement_uri: null,
          rights_chosen_at: null,
          rights_holder: null,
          consent_basis: null,
          consent_recorded_at: null,
          record_language_tag: 'it',
          record_script: 'Latn',
          record_direction: 'ltr',
          revised_at: null,
          published_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('elimina l\'edizione se il passo di copia fallisce', async () => {
    const result = await createEditionWithCopyStep(
      db.client,
      'author-1',
      { originalId: 'orig-1', languageTag: 'en', startFrom: 'copy' },
      async () => {
        throw new Error('copy_midway');
      }
    );
    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(db.tables.biographies.filter((b) => b.translation_of === 'orig-1')).toHaveLength(0);
  });

  it('i due modi e blank (import)', async () => {
    for (const startFrom of ['copy', 'blank'] as const) {
      const result = await createEditionWithCopyStep(db.client, 'author-1', {
        originalId: 'orig-1',
        languageTag: startFrom === 'copy' ? 'en' : 'fr',
        startFrom,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const row = db.tables.biographies.find((b) => b.id === result.id) as Record<string, unknown>;
        expect(row.um_id).toBeUndefined();
        expect(row.translation_of).toBe('orig-1');
      }
    }
  });
});

describe('nessuna emissione UM', () => {
  it('edition-create non chiama mintUmIdFor', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/server/edition-create.ts'), 'utf8');
    expect(src).not.toMatch(/mintUmIdFor/);
    expect(src).not.toMatch(/is_pioneer\s*:/);
  });
});
