import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildEditionInsertRow, type OriginalForEdition } from '@/lib/server/edition-create';
import { textLanguageIdentity } from '@/lib/text-languages';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Visibilità e licenza dell'edizione seguono l'originale.
 * L'inserimento usa buildEditionInsertRow (stesso payload della rotta), così
 * passa tutti i trigger dello schema.
 */
let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await reseed(db);
});

const asAuthor = (sql: string, params: unknown[] = []) => as(db, 'authenticated', U.author, sql, params);
const asAnon = (sql: string, params: unknown[] = []) => as(db, 'anon', null, sql, params);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

const JSONB_KEYS = new Set(['content', 'narrative_order']);

async function insertFromRow(row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const params = keys.map((k) => {
    const v = row[k];
    return v !== null && typeof v === 'object' && JSONB_KEYS.has(k) ? JSON.stringify(v) : v;
  });
  const cols = keys.join(', ');
  const ph = keys
    .map((k, i) => `$${i + 1}${JSONB_KEYS.has(k) ? '::jsonb' : ''}`)
    .join(', ');
  const [inserted] = await asService<{ id: string }>(
    `insert into public.biographies (${cols}) values (${ph}) returning id`,
    params
  );
  return inserted.id;
}

async function loadOriginal(id: string): Promise<OriginalForEdition> {
  const [row] = await asService<OriginalForEdition>(
    `select id, user_id, translation_of, status, is_frozen, biography_type, title, author_name,
            subject_name, name_as_written, name_given, name_family, name_order, name_romanized,
            romanization_system, biography_mode, content, content_freeflow, narrative_order,
            visibility, rights_statement_uri, rights_chosen_at, rights_holder, consent_basis,
            consent_recorded_at, record_language_tag, revised_at, published_at
     from biographies where id = $1`,
    [id]
  );
  return row;
}

describe('visibilità e licenza dell\'edizione', () => {
  it('edizione pubblicata di originale pubblico: anonimo legge; sync e guard', async () => {
    const license = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
    await asService(
      `update biographies set
         visibility = 'public',
         rights_statement_uri = $2,
         rights_chosen_at = '2026-01-01T00:00:00Z',
         rights_holder = 'Anna',
         content = '{"childhood":{"text":"Infanzia","todo":false,"audioTranscript":""}}'::jsonb,
         content_freeflow = '<p>Testo originale</p>',
         narrative_order = '["childhood"]'::jsonb,
         biography_mode = 'freeflow'
       where id = $1`,
      [BIO.published, license]
    );

    const original = await loadOriginal(BIO.published);
    expect(original.visibility).toBe('public');

    const language = textLanguageIdentity('en');
    expect(language).toBeTruthy();
    const row = buildEditionInsertRow({
      userId: U.author,
      original,
      language: language!,
      startFrom: 'copy',
    });
    expect(row.visibility).toBe('public');
    expect(row.rights_statement_uri).toBe(license);

    const editionId = await insertFromRow(row);
    await asService(
      `update biographies set status = 'published', published_at = now() where id = $1`,
      [editionId]
    );

    const allowed = await asAnon(
      `select public.biography_public_read_allowed($1) as ok`,
      [editionId]
    );
    expect(allowed[0]).toMatchObject({ ok: true });
    expect(await asAnon(`select id from biographies where id = $1`, [editionId])).toHaveLength(1);
    expect(
      await asAnon(`select id from biography_flat where id = $1`, [editionId])
    ).toHaveLength(1);

    await asAuthor(`update biographies set visibility = 'link-only' where id = $1`, [
      BIO.published,
    ]);
    const [afterLink] = await asService<{ visibility: string }>(
      `select visibility from biographies where id = $1`,
      [editionId]
    );
    expect(afterLink.visibility).toBe('link-only');
    expect(await asAnon(`select id from biographies where id = $1`, [editionId])).toEqual([]);

    await asAuthor(
      `update biographies set
         visibility = 'public',
         rights_statement_uri = $2,
         rights_chosen_at = '2026-01-01T00:00:00Z',
         rights_holder = 'Anna'
       where id = $1`,
      [BIO.published, license]
    );
    const [afterPublic] = await asService<{ visibility: string }>(
      `select visibility from biographies where id = $1`,
      [editionId]
    );
    expect(afterPublic.visibility).toBe('public');

    const openLicense = 'https://creativecommons.org/licenses/by/4.0/';
    await asAuthor(
      `update biographies set
         rights_statement_uri = $2,
         rights_chosen_at = '2026-06-01T00:00:00Z',
         rights_holder = 'Anna'
       where id = $1`,
      [BIO.published, openLicense]
    );
    const [afterLicense] = await asService<{
      rights_statement_uri: string;
      rights_holder: string | null;
    }>(`select rights_statement_uri, rights_holder from biographies where id = $1`, [editionId]);
    expect(afterLicense.rights_statement_uri).toBe(openLicense);

    const visErr = await errorOf(() =>
      asAuthor(`update biographies set visibility = 'private' where id = $1`, [editionId])
    );
    expect(visErr).toContain('edition_visibility_rights_follow_original');

    const rightsErr = await errorOf(() =>
      asAuthor(
        `update biographies set rights_statement_uri = $2 where id = $1`,
        [editionId, license]
      )
    );
    expect(rightsErr).toContain('edition_visibility_rights_follow_original');

    await asService(`update biographies set visibility = 'private' where id = $1`, [editionId]);
    const [serviceWrite] = await asService<{ visibility: string }>(
      `select visibility from biographies where id = $1`,
      [editionId]
    );
    expect(serviceWrite.visibility).toBe('private');

    await asAuthor(`update biographies set visibility = 'link-only' where id = $1`, [
      BIO.published,
    ]);
    const [resynced] = await asService<{ visibility: string }>(
      `select visibility from biographies where id = $1`,
      [editionId]
    );
    expect(resynced.visibility).toBe('link-only');

    await asAuthor(`update biographies set visibility = 'private' where id = $1`, [
      BIO.published,
    ]);
    const nonPublic = await asAnon(
      `select public.biography_public_read_allowed($1) as ok`,
      [editionId]
    );
    expect(nonPublic[0]).toMatchObject({ ok: false });
    expect(await asAnon(`select id from biographies where id = $1`, [editionId])).toEqual([]);
  });
});
