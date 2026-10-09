import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDb } from './harness';

/**
 * La seconda migrazione non entra nel banco abituale: qui si applicano
 * entrambe, dopo aver ricreato la vista di produzione che dipende da
 * content_language.
 */
describe('eliminazione di content_language', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    await db.exec(`
      alter table public.person_events add column if not exists date_start_iso date;
      alter table public.person_events add column if not exists date_start_jdn integer;
      alter table public.person_events add column if not exists place_lat double precision;
      alter table public.person_events add column if not exists place_lon double precision;
    `);
    const view = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260904090400_biography_flat_view.sql'),
      'utf8'
    ).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
    await db.exec(view);
    const drop = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261009150000_drop_content_language_after_release.sql'),
      'utf8'
    );
    await db.exec(drop);
  }, 60_000);

  afterAll(async () => {
    await db.close();
  });

  it('toglie la colonna, ricrea la vista e lascia solo SELECT', async () => {
    const columns = await as<{ column_name: string }>(
      db,
      'postgres',
      null,
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'biographies' and column_name = 'content_language'`
    );
    expect(columns).toEqual([]);

    const viewCols = await as<{ column_name: string }>(
      db,
      'postgres',
      null,
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'biography_flat'
       order by ordinal_position`
    );
    const names = viewCols.map((c) => c.column_name);
    expect(names).toEqual([
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
    ]);
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
  });
});
