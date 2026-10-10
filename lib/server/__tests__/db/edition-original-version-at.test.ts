import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

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
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

describe('original_version_at', () => {
  it('la colonna esiste ed è ammessa nulla', async () => {
    const [col] = await asService<{ data_type: string; is_nullable: string }>(
      `select data_type, is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'biographies' and column_name = 'original_version_at'`
    );
    expect(col.data_type).toBe('timestamp with time zone');
    expect(col.is_nullable).toBe('YES');
  });

  it('è nelle colonne riservate al server', async () => {
    const [row] = await asService<{ cols: string[] }>(
      `select public.biographies_server_owned_columns() as cols`
    );
    expect(row.cols).toContain('original_version_at');
  });

  it('l\'autore non la valorizza in inserimento né in aggiornamento', async () => {
    const insertErr = await errorOf(() =>
      as(
        db,
        'authenticated',
        U.fresh,
        `insert into biographies (user_id, title, record_language_tag, record_script, record_direction, original_version_at)
         values ($1, 'x', 'it', 'Latn', 'ltr', now())`,
        [U.fresh]
      )
    );
    expect(insertErr).toContain('server_only_column');
    expect(insertErr).toContain('original_version_at');

    const updateErr = await errorOf(() =>
      asAuthor(`update biographies set original_version_at = now() where id = $1`, [BIO.draft])
    );
    expect(updateErr).toContain('server_only_column');
    expect(updateErr).toContain('original_version_at');
  });

  it('il ruolo di servizio sì', async () => {
    const [edition] = await asService<{ id: string; original_version_at: string | null }>(
      `insert into biographies (user_id, title, translation_of, record_language_tag, record_script, record_direction, original_version_at)
       values ($1, 'Es', $2, 'es', 'Latn', 'ltr', '2026-01-15T12:00:00Z')
       returning id, original_version_at`,
      [U.author, BIO.published]
    );
    expect(edition.original_version_at).toBeTruthy();
    await asService(`update biographies set original_version_at = '2026-02-01T00:00:00Z' where id = $1`, [
      edition.id,
    ]);
  });

  it('biography_flat non la espone e resta a 78 colonne', async () => {
    const names = await asService<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'biography_flat'
       order by ordinal_position`
    );
    expect(names.map((r) => r.column_name)).not.toContain('original_version_at');
    expect(names).toHaveLength(78);
  });
});
