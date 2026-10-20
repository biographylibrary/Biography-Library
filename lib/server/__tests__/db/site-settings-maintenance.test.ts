import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDb, errorOf, U } from './harness';
import type { PGlite } from '@electric-sql/pglite';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe('site_settings RLS', () => {
  it('anon legge solo la chiave maintenance', async () => {
    const rows = await as<{ key: string; value: { enabled: boolean } }>(
      db,
      'anon',
      null,
      `select key, value from public.site_settings`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'maintenance', value: { enabled: false } });
  });

  it('authenticated legge solo maintenance, non altre chiavi', async () => {
    await as(
      db,
      'service_role',
      null,
      `insert into public.site_settings (key, value) values ('secret', '{"x":1}'::jsonb)
       on conflict (key) do nothing`
    );
    const rows = await as<{ key: string }>(
      db,
      'authenticated',
      U.author,
      `select key from public.site_settings order by key`
    );
    expect(rows.map((r) => r.key)).toEqual(['maintenance']);
  });

  it('anon e authenticated non possono scrivere', async () => {
    const updateSql = `update public.site_settings set value = '{"enabled":true}'::jsonb where key = 'maintenance'`;
    const insertSql = `insert into public.site_settings (key, value) values ('other', '{}'::jsonb)`;
    expect(await errorOf(() => as(db, 'anon', null, updateSql))).toMatch(
      /permission denied|violates/i
    );
    expect(await errorOf(() => as(db, 'authenticated', U.author, updateSql))).toMatch(
      /permission denied|violates/i
    );
    expect(await errorOf(() => as(db, 'anon', null, insertSql))).toMatch(
      /permission denied|violates/i
    );
    expect(await errorOf(() => as(db, 'authenticated', U.author, insertSql))).toMatch(
      /permission denied|violates/i
    );
  });

  it('service_role può aggiornare maintenance', async () => {
    await as(
      db,
      'service_role',
      null,
      `update public.site_settings set value = '{"enabled":true}'::jsonb where key = 'maintenance'`
    );
    const rows = await as<{ value: { enabled: boolean } }>(
      db,
      'anon',
      null,
      `select value from public.site_settings where key = 'maintenance'`
    );
    expect(rows[0]?.value?.enabled).toBe(true);
    await as(
      db,
      'service_role',
      null,
      `update public.site_settings set value = '{"enabled":false}'::jsonb where key = 'maintenance'`
    );
  });
});
