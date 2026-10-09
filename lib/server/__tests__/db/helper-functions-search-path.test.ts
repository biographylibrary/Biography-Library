import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { U, as, createTestDb } from './harness';

/**
 * Migrazione 20260930120300: le sei funzioni di elenco costante fissano `search_path`.
 *
 * Il controllo di sicurezza di Supabase segnala le funzioni col percorso di ricerca
 * mutabile. Fissarlo a vuoto è corretto solo se i corpi non usano nulla di `public`
 * senza schema: qui si dimostra che (1) le sei funzioni danno gli stessi valori prima e
 * dopo, (2) corpo, volatilità, proprietà e permessi non cambiano, (3) i corpi non
 * nominano altro che costruttori di `pg_catalog`, (4) un corpo che nominasse
 * una funzione di `public` senza schema, con il percorso vuoto, si romperebbe
 * (il controllo non è una formalità).
 */
const FILE = '20260930120300_helper_functions_search_path.sql';
const SIX = [
  'author_text_writable_statuses',
  'biographies_author_text_columns',
  'biographies_server_owned_columns',
  'biographies_insert_defaults',
  'profiles_server_owned_columns',
  'profiles_insert_defaults',
] as const;
const ELEVEN = [
  ...SIX,
  'ai_author_token_usage',
  'author_text_child_guard',
  'biographies_guard_author_text',
  'biographies_guard_server_columns',
  'profiles_guard_server_columns',
];

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb({ skip: [FILE, '20261009143000_biography_editions.sql'] });
}, 120_000);

afterAll(async () => {
  await db.close();
});

async function describeFunctions(names: readonly string[]) {
  const rows = await db.query<{
    proname: string;
    prosrc: string;
    provolatile: string;
    prosecdef: boolean;
    owner: string;
    proconfig: string[] | null;
    anon: boolean;
    auth: boolean;
    service: boolean;
  }>(
    `select p.proname, p.prosrc, p.provolatile, p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proconfig,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
            has_function_privilege('service_role', p.oid, 'EXECUTE') as service
       from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1) order by p.proname`,
    [names as string[]]
  );
  return rows.rows;
}

async function values() {
  const out: Record<string, string> = {};
  for (const fn of SIX) {
    const [row] = await as<{ v: string }>(db, 'authenticated', U.author, `select public.${fn}()::text as v`);
    out[fn] = row.v;
  }
  return out;
}

describe('migrazione 20260930120300: search_path delle sei funzioni di elenco costante', () => {
  it('prima della migrazione le sei funzioni non hanno il percorso fissato', async () => {
    const before = await describeFunctions(SIX);
    expect(before).toHaveLength(6);
    expect(before.map((f) => f.proconfig)).toEqual([null, null, null, null, null, null]);
  });

  it('dopo la migrazione: percorso vuoto; valori, corpo, volatilità, proprietario e permessi invariati', async () => {
    const beforeFns = await describeFunctions(SIX);
    const beforeValues = await values();

    await db.exec(readFileSync(join(process.cwd(), 'supabase', 'migrations', FILE), 'utf8'));

    const afterFns = await describeFunctions(SIX);
    expect(afterFns.map((f) => f.proconfig)).toEqual(SIX.map(() => ['search_path=""']));
    const strip = ({ proconfig: _c, ...rest }: (typeof beforeFns)[number]) => rest;
    expect(afterFns.map(strip)).toEqual(beforeFns.map(strip));
    // Nessuna SECURITY DEFINER, nessuna eseguibile da anon, authenticated e il servizio sì.
    expect(afterFns.every((f) => !f.prosecdef && !f.anon && f.auth && f.service)).toBe(true);
    // I valori restituiti sono identici a prima.
    expect(await values()).toEqual(beforeValues);
  });

  it('la migrazione si può rieseguire senza errori e senza cambiare nulla', async () => {
    const once = await describeFunctions(SIX);
    await db.exec(readFileSync(join(process.cwd(), 'supabase', 'migrations', FILE), 'utf8'));
    expect(await describeFunctions(SIX)).toEqual(once);
  });

  it('eseguono anche dal ruolo di servizio e da una sessione con percorso di ricerca suo', async () => {
    for (const fn of SIX) {
      const [svc] = await as<{ v: string }>(db, 'service_role', null, `select public.${fn}()::text as v`);
      expect(svc.v.length).toBeGreaterThan(2);
    }
    // Una sessione che cambia il proprio percorso non cambia il risultato (era lo scopo dell'avviso).
    await db.exec(`set role authenticated`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [U.author]);
    try {
      await db.exec(`set search_path = pg_temp`);
      const [row] = (await db.query<{ v: string }>(`select public.author_text_writable_statuses()::text as v`)).rows;
      expect(row.v).toContain('revision_requested');
    } finally {
      await db.exec(`reset search_path; reset role`);
    }
  });

  it('i corpi nominano solo il tipo text, il costruttore di array e jsonb_build_object (tutti di pg_catalog)', async () => {
    const fns = await describeFunctions(SIX);
    for (const fn of fns) {
      // Tolte le costanti fra apici, resta la struttura: nessuna chiamata a funzioni oltre jsonb_build_object,
      // nessun riferimento a tabelle (FROM), a schemi (punto), a tipi diversi da text.
      const structure = fn.prosrc.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, '').replace(/\s+/g, ' ');
      const calls = Array.from(structure.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi), (m) => m[1].toLowerCase());
      expect(calls.filter((c) => c !== 'jsonb_build_object'), fn.proname).toEqual([]);
      expect(structure, fn.proname).not.toMatch(/\bfrom\b/i);
      expect(structure, fn.proname).not.toMatch(/\bpublic\b/i);
      const casts = Array.from(structure.matchAll(/::\s*([a-z_][a-z0-9_]*(?:\[\])?)/gi), (m) => m[1].toLowerCase());
      expect(casts.filter((c) => c !== 'text[]'), fn.proname).toEqual([]);
    }
    // jsonb_build_object e il tipo text stanno in pg_catalog.
    const cat = await db.query<{ n: number }>(
      `select count(*)::int as n from pg_proc where proname = 'jsonb_build_object' and pronamespace = 'pg_catalog'::regnamespace`
    );
    expect(cat.rows[0].n).toBeGreaterThan(0);
  });

  it('controllo negativo: una funzione che nomina un\'altra di public senza schema, con percorso vuoto, non la trova', async () => {
    // Postgres controlla il corpo delle funzioni SQL alla creazione: con percorso vuoto il nome senza schema non si risolve.
    await expect(
      db.exec(`create function public.zz_probe_unqualified() returns text language sql set search_path = ''
                 as $$ select author_text_writable_statuses()::text $$;`)
    ).rejects.toThrow(/does not exist/);
    // Se il controllo è spento, la stessa funzione si crea ma fallisce alla chiamata.
    await db.exec(`set check_function_bodies = off;
      create function public.zz_probe_unqualified() returns text language sql set search_path = ''
        as $$ select author_text_writable_statuses()::text $$;
      reset check_function_bodies;
      create function public.zz_probe_qualified() returns text language sql set search_path = ''
        as $$ select public.author_text_writable_statuses()::text $$;`);
    try {
      await expect(db.query(`select public.zz_probe_unqualified()`)).rejects.toThrow(/does not exist/);
      const [ok] = (await db.query<{ v: string }>(`select public.zz_probe_qualified() as v`)).rows;
      expect(ok.v).toContain('draft');
    } finally {
      await db.exec(`drop function if exists public.zz_probe_unqualified(); drop function if exists public.zz_probe_qualified();`);
    }
  });

  it('controllo negativo: il test sui corpi si accorgerebbe di un riferimento senza schema', () => {
    const structure = `select jsonb_build_object('a', 1) || public.other_fn() from public.biographies`.replace(/'(?:[^']|'')*'/g, "''");
    const calls = Array.from(structure.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi), (m) => m[1].toLowerCase());
    expect(calls.filter((c) => c !== 'jsonb_build_object')).toEqual(['other_fn']);
    expect(structure).toMatch(/\bfrom\b/i);
  });

  it('tutte e undici le funzioni create dalle migrazioni del blocco 1 hanno il percorso fissato', async () => {
    const fns = await describeFunctions(ELEVEN);
    expect(fns).toHaveLength(11);
    expect(fns.filter((f) => !f.proconfig || !f.proconfig.some((c) => c.startsWith('search_path='))).map((f) => f.proname)).toEqual([]);
  });

  it('i guard continuano a funzionare con le funzioni a percorso vuoto', async () => {
    // L'autore scrive il titolo della propria bozza (elenco degli stati) ma non una colonna riservata.
    const ok = await as(db, 'authenticated', U.author, `update public.biographies set title = 'nuovo titolo' where id = (select id from public.biographies where status = 'draft' and user_id = '${U.author}' limit 1) returning id`);
    expect(ok).toHaveLength(1);
    await expect(
      as(db, 'authenticated', U.author, `update public.biographies set view_count = 99 where id = (select id from public.biographies where status = 'draft' and user_id = '${U.author}' limit 1)`)
    ).rejects.toThrow(/server_only_column/);
  });
});
