import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildEditionInsertRow,
  buildEditionTextFields,
  createEditionWithService,
  decideCreateEdition,
  isLanguageUniqueViolation,
  parseCreateEditionBody,
  type OriginalForEdition,
} from '@/lib/server/edition-create';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const ORIG_ID = '10000000-0000-4000-8000-000000000001';
const AUTHOR_ID = '20000000-0000-4000-8000-000000000001';

const baseOriginal = (): OriginalForEdition => ({
  id: ORIG_ID,
  user_id: AUTHOR_ID,
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
      decideCreateEdition({ userId: AUTHOR_ID, languageTag: 'en', original: null, existingTags: [] })
    ).toEqual({ ok: false, status: 404, error: 'not_found' });
  });

  it('forbidden', () => {
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'en',
        original: { ...baseOriginal(), user_id: 'other' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 403, error: 'forbidden' });
  });

  it('original_is_edition', () => {
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'en',
        original: { ...baseOriginal(), translation_of: 'root' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'original_is_edition' });
  });

  it('frozen', () => {
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'en',
        original: { ...baseOriginal(), is_frozen: true },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'frozen' });
  });

  it('original_not_published', () => {
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'en',
        original: { ...baseOriginal(), status: 'draft' },
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'original_not_published' });
  });

  it('language_already_present (edizione o originale)', () => {
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'en',
        original: baseOriginal(),
        existingTags: ['en'],
      })
    ).toEqual({ ok: false, status: 409, error: 'language_already_present' });
    expect(
      decideCreateEdition({
        userId: AUTHOR_ID,
        languageTag: 'it',
        original: baseOriginal(),
        existingTags: [],
      })
    ).toEqual({ ok: false, status: 409, error: 'language_already_present' });
  });
});

describe('buildEditionInsertRow', () => {
  it('non assegna um_id né Pioniere; original_version_at da published_at; copia visibility', () => {
    const row = buildEditionInsertRow({
      userId: AUTHOR_ID,
      original: baseOriginal(),
      language: { tag: 'en', script: 'Latn', direction: 'ltr', endonym: 'English' },
      startFrom: 'copy',
    });
    expect(row.um_id).toBeUndefined();
    expect(row.is_pioneer).toBeUndefined();
    expect(row.provisional_until).toBeUndefined();
    expect(row.next_chapter_available_at).toBeUndefined();
    expect(row.chapters_count).toBeUndefined();
    expect(row.translation_of).toBe(ORIG_ID);
    expect(row.status).toBe('draft');
    expect(row.schema_version).toBe(2);
    expect(row.original_version_at).toBe('2026-01-10T00:00:00Z');
    expect(row.visibility).toBe('public');
    expect(row.content_freeflow).toContain('Testo');
  });

  it('original_version_at da revised_at se presente', () => {
    const row = buildEditionInsertRow({
      userId: AUTHOR_ID,
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

describe('createEditionWithService: testo e struttura nella stessa INSERT', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = createFakeDb({
      biographies: [
        {
          id: ORIG_ID,
          user_id: AUTHOR_ID,
          translation_of: null,
          status: 'published',
          is_frozen: false,
          biography_type: 'autobiography',
          title: 'T',
          author_name: 'A',
          subject_name: null,
          name_as_written: 'A',
          biography_mode: 'freeflow',
          content: { childhood: { text: 'Infanzia', todo: false, audioTranscript: '' } },
          content_freeflow: '<h1>Capitolo</h1><p>Testo</p>',
          narrative_order: ['childhood'],
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

  it('con copy la riga inserita contiene già testo e struttura', async () => {
    const result = await createEditionWithService(db.client, AUTHOR_ID, {
      originalId: ORIG_ID,
      languageTag: 'en',
      startFrom: 'copy',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = db.tables.biographies.find((b) => b.id === result.id) as Record<string, unknown>;
    expect(row.translation_of).toBe(ORIG_ID);
    expect(row.content_freeflow).toContain('Testo');
    expect(row.content).toMatchObject({
      childhood: expect.objectContaining({ text: 'Infanzia' }),
    });
    expect(row.narrative_order).toEqual(['childhood']);
  });

  it('con blank la riga ha la sola struttura senza il testo', async () => {
    const result = await createEditionWithService(db.client, AUTHOR_ID, {
      originalId: ORIG_ID,
      languageTag: 'fr',
      startFrom: 'blank',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = db.tables.biographies.find((b) => b.id === result.id) as Record<string, unknown>;
    expect(row.content_freeflow).toContain('<h1>');
    expect(row.content_freeflow).not.toContain('Testo');
    const content = row.content as Record<string, { text?: string }>;
    expect(content.childhood?.text ?? '').toBe('');
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
