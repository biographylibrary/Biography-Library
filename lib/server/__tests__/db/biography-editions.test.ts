import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Il banco riproduce policy e trigger (ruoli, auth.uid(), le migrazioni vere).
 * Non riproduce gli avvisi ospitati di Supabase: quelli si leggono dal catalogo
 * locale con le stesse regole (RLS, search_path, SECURITY DEFINER eseguibile).
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
const asOther = (sql: string, params: unknown[] = []) => as(db, 'authenticated', U.other, sql, params);
const asAnon = (sql: string, params: unknown[] = []) => as(db, 'anon', null, sql, params);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

async function seq() {
  const [row] = await as<{ last_value: string; is_called: boolean }>(
    db,
    'postgres',
    null,
    `select last_value::text, is_called from public.biography_host_seq`
  );
  return row;
}

describe('edizioni', () => {
  it('un utente autenticato non imposta translation_of', async () => {
    const err = await errorOf(() =>
      asAuthor(`update biographies set translation_of = $2 where id = $1`, [BIO.draft, BIO.published])
    );
    expect(err).toContain('server_only_column');
    expect(err).toContain('translation_of');
  });

  it('l\'edizione di un originale non pubblico non è leggibile da anonimo né da un altro autore', async () => {
    const [edition] = await asService<{ id: string }>(
      `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction, status, visibility, rights_statement_uri)
       values ($1, 'Traduzione', $2, 'es', 'Latn', 'ltr', 'published', 'public', 'https://creativecommons.org/licenses/by-nc-sa/4.0/')
       returning id`,
      [U.author, BIO.draft]
    );
    expect(await asAnon(`select id from biographies where id = $1`, [edition.id])).toEqual([]);
    expect(await asOther(`select id from biographies where id = $1`, [edition.id])).toEqual([]);
    const own = await asAuthor(`select id from biographies where id = $1`, [edition.id]);
    expect(own).toHaveLength(1);
  });

  it('non si creano due traduzioni nella stessa lingua', async () => {
    await asService(
      `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
       values ($1, 'Uno', $2, 'es', 'Latn', 'ltr')`,
      [U.author, BIO.published]
    );
    const err = await errorOf(() =>
      asService(
        `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
         values ($1, 'Due', $2, 'es', 'Latn', 'ltr')`,
        [U.author, BIO.published]
      )
    );
    expect(err).toMatch(/duplicate key|unique/i);
  });

  it('fallisce se l\'originale è di un altro utente o è a sua volta un\'edizione', async () => {
    const other = await errorOf(() =>
      asService(
        `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
         values ($1, 'Altrui', $2, 'es', 'Latn', 'ltr')`,
        [U.author, BIO.otherDraft]
      )
    );
    expect(other).toContain('translation_owner_mismatch');

    const [edition] = await asService<{ id: string }>(
      `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
       values ($1, 'Prima', $2, 'es', 'Latn', 'ltr') returning id`,
      [U.author, BIO.published]
    );
    const chain = await errorOf(() =>
      asService(
        `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
         values ($1, 'Catena', $2, 'fr', 'Latn', 'ltr')`,
        [U.author, edition.id]
      )
    );
    expect(chain).toContain('translation_of_edition');
  });

  it('pubblicare un\'edizione non alza chapters_count e non consuma il numero del Pioniere', async () => {
    const before = await seq();
    const [original] = await asService<{ chapters_count: number }>(
      `select chapters_count from biographies where id = $1`,
      [BIO.published]
    );
    const [edition] = await asService<{ id: string; is_pioneer: boolean; chapters_count: number }>(
      `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
       values ($1, 'Spagnolo', $2, 'es', 'Latn', 'ltr')
       returning id, is_pioneer, chapters_count`,
      [U.author, BIO.published]
    );
    expect(edition.is_pioneer).toBe(false);
    expect(await seq()).toEqual(before);
    await asService(`update biographies set status = 'published', published_at = now() where id = $1`, [edition.id]);
    const [afterEdition] = await asService<{ chapters_count: number; last_chapter_published_at: string | null }>(
      `select chapters_count, last_chapter_published_at from biographies where id = $1`,
      [edition.id]
    );
    const [afterOriginal] = await asService<{ chapters_count: number }>(
      `select chapters_count from biographies where id = $1`,
      [BIO.published]
    );
    expect(afterEdition.chapters_count).toBe(0);
    expect(afterEdition.last_chapter_published_at).toBeNull();
    expect(afterOriginal.chapters_count).toBe(original.chapters_count);
  });

  it('dalla versione finale al lock senza pdf_draft, e il client non può farlo', async () => {
    const [constraint] = await asService<{ def: string }>(
      `select pg_get_constraintdef(oid) as def
       from pg_constraint
       where conname = 'biographies_status_check'`
    );
    expect(constraint.def).toContain('final_version');
    expect(constraint.def).toContain('locked_pending_screening');
    expect(constraint.def).toContain('pdf_draft');

    const client = await errorOf(() =>
      asAuthor(`update biographies set status = 'locked_pending_screening' where id = $1`, [BIO.finalVersion])
    );
    expect(client).toContain('server_only_column');

    await asService(
      `update biographies
       set status = 'locked_pending_screening', final_pdf_approved_at = now(), ai_screening_status = 'pending'
       where id = $1`,
      [BIO.finalVersion]
    );
    const [row] = await asService<{ status: string; pdf_draft_started_at: string | null }>(
      `select status, pdf_draft_started_at from biographies where id = $1`,
      [BIO.finalVersion]
    );
    expect(row.status).toBe('locked_pending_screening');
    expect(row.pdf_draft_started_at).toBeNull();
  });

  it('catalogo di sicurezza: RLS, search_path, definer eseguibile solo dove serve', async () => {
    const [table] = await asService<{ rls: boolean }>(
      `select relrowsecurity as rls from pg_class where relname = 'biography_edition_captions'`
    );
    expect(table.rls).toBe(true);
    const policies = await asService<{ policyname: string }>(
      `select policyname from pg_policies where tablename = 'biography_edition_captions' order by 1`
    );
    expect(policies.map((p) => p.policyname)).toEqual([
      'Edition captions: owner delete',
      'Edition captions: owner or staff read',
      'Edition captions: owner update',
      'Edition captions: owner write',
      'Edition captions: public read',
    ]);
    const bios = await asService<{ policyname: string }>(
      `select policyname from pg_policies where tablename = 'biographies' and policyname in ('Public read for published biographies', 'Biographies: owner or public access')`
    );
    expect(bios).toHaveLength(2);

    const fns = await asService<{ proname: string; config: string[] | null; secdef: boolean; anon: boolean }>(
      `select p.proname, p.proconfig as config, p.prosecdef as secdef,
              has_function_privilege('anon', p.oid, 'execute') as anon
       from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname = any($1)
       order by 1`,
      [[
        'biography_public_read_allowed',
        'biographies_edition_rules',
        'reject_life_facts_on_edition',
        'biographies_server_owned_columns',
      ]]
    );
    const byName = Object.fromEntries(fns.map((row) => [row.proname, row]));
    expect(byName.biography_public_read_allowed.secdef).toBe(true);
    expect(byName.biography_public_read_allowed.anon).toBe(true);
    expect(byName.biography_public_read_allowed.config?.some((c) => c.startsWith('search_path='))).toBe(true);
    expect(byName.biographies_edition_rules.anon).toBe(false);
    expect(byName.reject_life_facts_on_edition.anon).toBe(false);
    expect(byName.biographies_server_owned_columns.config).toEqual(['search_path=""']);

    const store = readFileSync(join(process.cwd(), 'lib/server/archive-package-store.ts'), 'utf8');
    expect(store).not.toMatch(/final_pdf/);
  });
});

describe('didascalie di edizione', () => {
  const edition = '20000000-0000-0000-0000-0000000000e1';

  async function editionWithPhoto(status: string) {
    await asService(
      `insert into biographies (id, user_id, status, title, translation_of, record_language_tag, record_script, record_direction)
       values ($1, $2, $3, 'Edizione', $4, 'es', 'Latn', 'ltr')`,
      [edition, U.author, status, BIO.published]
    );
    const [media] = await asService<{ id: string }>(
      `insert into biography_media (biography_id, user_id, file_url, caption) values ($1, $2, 'https://x/f.jpg', 'originale') returning id`,
      [BIO.published, U.author]
    );
    return media.id;
  }

  it('il proprietario legge la didascalia in bozza; un altro autore no; lo staff sì', async () => {
    const mediaId = await editionWithPhoto('draft');
    await asService(
      `insert into biography_edition_captions (biography_id, media_id, caption) values ($1, $2, 'mia')`,
      [edition, mediaId]
    );
    expect(await asAuthor(`select caption from biography_edition_captions where biography_id = $1`, [edition])).toEqual([
      { caption: 'mia' },
    ]);
    expect(await asOther(`select caption from biography_edition_captions where biography_id = $1`, [edition])).toEqual([]);
    expect(await asAnon(`select caption from biography_edition_captions where biography_id = $1`, [edition])).toEqual([]);
    const staff = await as<{ caption: string }>(
      db,
      'authenticated',
      U.staff,
      `select caption from biography_edition_captions where biography_id = $1`,
      [edition]
    );
    expect(staff).toEqual([{ caption: 'mia' }]);
  });

  it('la foto deve essere dell\'originale', async () => {
    await editionWithPhoto('draft');
    const [foreign] = await asService<{ id: string }>(
      `insert into biography_media (biography_id, user_id, file_url) values ($1, $2, 'https://x/altra.jpg') returning id`,
      [BIO.draft, U.author]
    );
    const err = await errorOf(() =>
      asService(
        `insert into biography_edition_captions (biography_id, media_id, caption) values ($1, $2, 'no')`,
        [edition, foreign.id]
      )
    );
    expect(err).toContain('caption_media_not_on_original');
  });

  it('un update non scrive una didascalia su una scheda che non è un\'edizione', async () => {
    const [media] = await asService<{ id: string }>(
      `insert into biography_media (biography_id, user_id, file_url) values ($1, $2, 'https://x/f.jpg') returning id`,
      [BIO.draft, U.author]
    );
    await as(db, 'postgres', null, `set session_replication_role = replica`);
    try {
      await as(
        db,
        'postgres',
        null,
        `insert into biography_edition_captions (biography_id, media_id, caption) values ($1, $2, 'appesa')`,
        [BIO.draft, media.id]
      );
    } finally {
      await as(db, 'postgres', null, `set session_replication_role = origin`);
    }
    await asAuthor(
      `update biography_edition_captions set caption = 'cambiata' where biography_id = $1`,
      [BIO.draft]
    );
    const [row] = await asService<{ caption: string }>(
      `select caption from biography_edition_captions where biography_id = $1`,
      [BIO.draft]
    );
    expect(row.caption).toBe('appesa');
  });

  it.each(['locked_pending_screening', 'published'])(
    'in stato %s insert, update e delete falliscono con author_text_locked',
    async (status) => {
      const mediaId = await editionWithPhoto(status);
      await asService(
        `insert into biography_edition_captions (biography_id, media_id, caption) values ($1, $2, 'mia')`,
        [edition, mediaId]
      );
      const [second] = await asService<{ id: string }>(
        `insert into biography_media (biography_id, user_id, file_url) values ($1, $2, 'https://x/f2.jpg') returning id`,
        [BIO.published, U.author]
      );
      expect(
        await errorOf(() =>
          asAuthor(
            `insert into biography_edition_captions (biography_id, media_id, caption) values ($1, $2, 'altra')`,
            [edition, second.id]
          )
        )
      ).toContain('author_text_locked');
      expect(
        await errorOf(() =>
          asAuthor(`update biography_edition_captions set caption = 'x' where biography_id = $1`, [edition])
        )
      ).toContain('author_text_locked');
      expect(
        await errorOf(() =>
          asAuthor(`delete from biography_edition_captions where biography_id = $1`, [edition])
        )
      ).toContain('author_text_locked');
    }
  );
});
