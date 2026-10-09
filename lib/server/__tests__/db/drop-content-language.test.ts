import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb } from './harness';

/**
 * Il banco abituale applica già la seconda migrazione. Il primo blocco
 * riparte dallo stato precedente (vista vecchia, colonna ancora presente)
 * saltando quel file, poi lo esegue. L'atomicità prova lo stesso punto
 * di partenza dentro una transazione che si annulla.
 */
const DROP_FILE = '20261009150000_drop_content_language_after_release.sql';

const FLAT_COLUMNS = [
  'id',
  'user_id',
  'title',
  'content',
  'visibility',
  'status',
  'created_at',
  'updated_at',
  'share_token',
  'completed_at',
  'editor_font_size',
  'final_version',
  'narrative_order',
  'published_at',
  'author_name',
  'frozen_at',
  'frozen_reason',
  'last_chapter_published_at',
  'next_chapter_available_at',
  'chapters_count',
  'linked_biography_ids',
  'is_frozen',
  'view_count',
  'is_featured',
  'featured_at',
  'featured_by',
  'biography_mode',
  'content_freeflow',
  'biography_type',
  'slug',
  'ai_screening_status',
  'pdf_draft_iteration',
  'reviewed_by',
  'reviewed_at',
  'export_txt_url',
  'export_docx_url',
  'pdf_draft_started_at',
  'final_pdf_approved_at',
  'final_pdf_url',
  'listing_cover_url',
  'draft_ai_feedback',
  'chapter_available_email_sent_at',
  'pdf_draft_reminder_sent_at',
  'subject_name',
  'um_id',
  'schema_version',
  'record_language_tag',
  'record_script',
  'record_direction',
  'translation_of',
  'record_language_endonym',
  'name_as_written',
  'name_given',
  'name_family',
  'name_order',
  'name_romanized',
  'romanization_system',
  'published_at_iso',
  'published_um_year',
  'rights_statement_uri',
  'rights_chosen_at',
  'rights_holder',
  'consent_basis',
  'consent_recorded_at',
  'birth_date_edtf',
  'birth_date_as_given',
  'birth_date_start_iso',
  'birth_date_start_jdn',
  'birth_place_as_given',
  'birth_place_lat',
  'birth_place_lon',
  'death_date_edtf',
  'death_date_as_given',
  'death_date_start_iso',
  'death_date_start_jdn',
  'death_place_as_given',
  'death_place_lat',
  'death_place_lon',
];

function migrationSql(name: string): string {
  return readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8');
}

function oldFlatViewSql(): string {
  return migrationSql('20260904090400_biography_flat_view.sql').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
}

async function columnNames(db: PGlite, table: string): Promise<string[]> {
  const rows = await as<{ column_name: string }>(
    db,
    'postgres',
    null,
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table]
  );
  return rows.map((row) => row.column_name);
}

async function assertFlatView(db: PGlite): Promise<void> {
  const biographies = await columnNames(db, 'biographies');
  expect(biographies).not.toContain('content_language');

  const names = await columnNames(db, 'biography_flat');
  expect(names).toEqual(FLAT_COLUMNS);
  expect(names).toHaveLength(78);
  expect(names).not.toContain('content_language');
  expect(names).not.toContain('content_html_legacy');
  expect(names).not.toContain('provisional_until');
  expect(names).not.toContain('revised_at');
  expect(names).not.toContain('is_pioneer');
  expect(names[names.indexOf('record_direction') + 1]).toBe('translation_of');

  const rows = await as(db, 'postgres', null, `select id from public.biography_flat limit 1`);
  expect(Array.isArray(rows)).toBe(true);

  for (const grantee of ['anon', 'authenticated', 'service_role']) {
    const grants = await as<{ privilege_type: string }>(
      db,
      'postgres',
      null,
      `select privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'biography_flat' and grantee = $1
       order by 1`,
      [grantee]
    );
    expect(grants.map((g) => g.privilege_type)).toEqual(['SELECT']);
  }
}

describe('eliminazione di content_language', () => {
  describe('dallo stato precedente, con la vista che dipende dalla colonna', () => {
    let db: PGlite;

    beforeAll(async () => {
      db = await createTestDb({ skip: [DROP_FILE] });
      await db.exec(oldFlatViewSql());
      await db.exec(migrationSql(DROP_FILE));
    }, 60_000);

    afterAll(async () => {
      await db.close();
    });

    it('toglie la colonna, ricrea la vista e lascia solo SELECT', async () => {
      await assertFlatView(db);
    });
  });

  describe('banco abituale', () => {
    let db: PGlite;

    beforeAll(async () => {
      db = await createTestDb();
    }, 60_000);

    afterAll(async () => {
      await db.close();
    });

    it('non ha la colonna e biography_flat ha le stesse 78 colonne', async () => {
      await assertFlatView(db);
    });

    it('una scheda e la sua edizione compaiono, translation_of solo sull\'edizione', async () => {
      const [edition] = await as<{ id: string }>(
        db,
        'service_role',
        null,
        `insert into public.biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction)
         values ($1, 'Spagnolo', $2, 'es', 'Latn', 'ltr')
         returning id`,
        [U.author, BIO.published]
      );
      const rows = await as<{ id: string; translation_of: string | null }>(
        db,
        'postgres',
        null,
        `select id, translation_of from public.biography_flat
         where id = any($1::uuid[])
         order by translation_of nulls first`,
        [[BIO.published, edition.id]]
      );
      expect(rows).toEqual([
        { id: BIO.published, translation_of: null },
        { id: edition.id, translation_of: BIO.published },
      ]);
    });
  });

  describe('atomicità', () => {
    let db: PGlite;

    beforeAll(async () => {
      db = await createTestDb({ skip: [DROP_FILE] });
      await db.exec(oldFlatViewSql());
    }, 60_000);

    afterAll(async () => {
      await db.close();
    });

    it('dentro BEGIN … ROLLBACK la colonna e la vista vecchia tornano com\'erano', async () => {
      const columnBefore = await columnNames(db, 'biographies');
      const viewBefore = await columnNames(db, 'biography_flat');
      expect(columnBefore).toContain('content_language');
      expect(viewBefore).toContain('content_language');

      await db.exec(`begin;\n${migrationSql(DROP_FILE)}\nrollback;`);

      expect(await columnNames(db, 'biographies')).toEqual(columnBefore);
      expect(await columnNames(db, 'biography_flat')).toEqual(viewBefore);
    });
  });
});
