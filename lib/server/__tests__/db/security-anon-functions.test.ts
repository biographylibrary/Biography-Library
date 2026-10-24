import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf } from './harness';

const MIGRATION = '20261024100000_security_anon_functions.sql';
const sqlText = readFileSync(join(process.cwd(), 'supabase', 'migrations', MIGRATION), 'utf8');

/** Oggetti che in produzione esistono da migrazioni storiche non nella lista del harness. */
const STUBS = `
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  user_id uuid PRIMARY KEY,
  daily_count integer NOT NULL DEFAULT 0,
  weekly_count integer NOT NULL DEFAULT 0,
  daily_reset_at timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  weekly_reset_at timestamptz NOT NULL DEFAULT date_trunc('week', now())
);
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.cleanup_ai_rate_limits_30d()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  DELETE FROM ai_rate_limits WHERE created_at < now() - interval '30 days';
$$;
CREATE OR REPLACE FUNCTION public.get_ai_usage(p_user_id uuid)
RETURNS TABLE(daily_count integer, weekly_count integer, daily_reset_at timestamptz, weekly_reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY SELECT 0::integer, 0::integer, now(), now();
END;
$$;
-- Presente in produzione (migrazione 20260324) ma non nella lista del harness.
CREATE OR REPLACE FUNCTION public.update_moderation_reports_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
-- Default privileges del harness: EXECUTE ad anon/authenticated/service_role
GRANT EXECUTE ON FUNCTION public.cleanup_ai_rate_limits_30d() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_usage(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_moderation_reports_updated_at() TO anon, authenticated, service_role;
`;

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb({
    extraFiles: [],
  });
  await db.exec(STUBS);
  await db.exec(sqlText);
}, 60_000);
afterAll(async () => {
  await db.close();
});

type Priv = {
  proname: string;
  anon: boolean;
  authenticated: boolean;
  service: boolean;
  returns: string;
};

async function priv(name: string): Promise<Priv> {
  const { rows } = await db.query<Priv>(
    `select p.proname,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
            has_function_privilege('service_role', p.oid, 'EXECUTE') as service,
            p.prorettype::regtype::text as returns
       from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname = $1
      order by p.oid
      limit 1`,
    [name]
  );
  if (!rows[0]) throw new Error(`missing function public.${name}`);
  return rows[0];
}

describe('20261024100000_security_anon_functions', () => {
  it('il file SQL contiene i REVOKE/GRANT e i controlli previsti', () => {
    expect(sqlText).toMatch(/REVOKE ALL ON FUNCTION public\.cleanup_ai_rate_limits_30d\(\) FROM anon/);
    expect(sqlText).toMatch(/GRANT EXECUTE ON FUNCTION public\.cleanup_ai_rate_limits_30d\(\) TO service_role/);
    expect(sqlText).toMatch(/p_user_id IS DISTINCT FROM \(SELECT auth\.uid\(\)\)/);
    expect(sqlText).toMatch(/\(SELECT auth\.role\(\)\) = 'service_role'/);
    expect(sqlText).not.toMatch(/request\.jwt\.claim\.role/);
    expect(sqlText).toMatch(/AND status = 'published'/);
    for (const fn of [
      'biographies_mark_pioneer',
      'handle_new_user',
      'set_biography_slug',
      'set_next_chapter_available_at',
      'update_moderation_reports_updated_at',
    ]) {
      expect(sqlText).toContain(`REVOKE ALL ON FUNCTION public.${fn}() FROM anon`);
      expect(sqlText).toContain(`REVOKE ALL ON FUNCTION public.${fn}() FROM authenticated`);
    }
  });

  it('cleanup_ai_rate_limits_30d: solo service_role', async () => {
    expect(await priv('cleanup_ai_rate_limits_30d')).toMatchObject({
      anon: false,
      authenticated: false,
      service: true,
    });
  });

  it('get_ai_usage: niente anon; authenticated e service_role sì; solo il proprio id', async () => {
    expect(await priv('get_ai_usage')).toMatchObject({
      anon: false,
      authenticated: true,
      service: true,
    });

    const own = await as<{ daily_count: number }>(
      db,
      'authenticated',
      U.author,
      `select * from public.get_ai_usage($1)`,
      [U.author]
    );
    expect(own.length).toBe(1);

    const other = await as(
      db,
      'authenticated',
      U.author,
      `select * from public.get_ai_usage($1)`,
      [U.other]
    );
    expect(other).toHaveLength(0);

    const asService = await as<{ daily_count: number }>(
      db,
      'service_role',
      null,
      `select * from public.get_ai_usage($1)`,
      [U.author]
    );
    expect(asService.length).toBe(1);

    // Caso PostgREST con solo request.jwt.claims JSON (senza request.jwt.claim.role)
    await db.exec('set role service_role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.query(`select set_config('request.jwt.claim.role', '', false)`);
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [
      JSON.stringify({ role: 'service_role' }),
    ]);
    try {
      const viaClaimsJson = (
        await db.query<{ daily_count: number }>(`select * from public.get_ai_usage($1)`, [U.author])
      ).rows;
      expect(viaClaimsJson).toHaveLength(1);
    } finally {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claims', '', false)`);
    }

    expect(
      await errorOf(() => as(db, 'anon', null, `select * from public.get_ai_usage($1)`, [U.author]))
    ).toMatch(/permission denied|must be owner/i);
  });

  it('increment_view_count aumenta solo le pubblicate', async () => {
    const beforeDraft = (
      await db.query<{ view_count: number }>(`select view_count from biographies where id = $1`, [
        BIO.draft,
      ])
    ).rows[0].view_count;
    await as(db, 'anon', null, `select public.increment_view_count($1)`, [BIO.draft]);
    const afterDraft = (
      await db.query<{ view_count: number }>(`select view_count from biographies where id = $1`, [
        BIO.draft,
      ])
    ).rows[0].view_count;
    expect(afterDraft).toBe(beforeDraft);

    const beforePub = (
      await db.query<{ view_count: number }>(`select view_count from biographies where id = $1`, [
        BIO.published,
      ])
    ).rows[0].view_count;
    await as(db, 'anon', null, `select public.increment_view_count($1)`, [BIO.published]);
    const afterPub = (
      await db.query<{ view_count: number }>(`select view_count from biographies where id = $1`, [
        BIO.published,
      ])
    ).rows[0].view_count;
    expect(afterPub).toBe(beforePub + 1);
  });

  it('le cinque funzioni trigger restano RETURNS trigger e non sono eseguibili da anon/authenticated', async () => {
    for (const name of [
      'biographies_mark_pioneer',
      'handle_new_user',
      'set_biography_slug',
      'set_next_chapter_available_at',
      'update_moderation_reports_updated_at',
    ]) {
      const row = await priv(name);
      expect(row.returns).toBe('trigger');
      expect(row.anon).toBe(false);
      expect(row.authenticated).toBe(false);
    }
  });
});
