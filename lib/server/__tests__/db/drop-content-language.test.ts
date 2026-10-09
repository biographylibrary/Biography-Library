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
    expect(names).not.toContain('content_language');
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
