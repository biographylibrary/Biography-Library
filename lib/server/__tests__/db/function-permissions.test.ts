import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf } from './harness';

/**
 * Permessi delle funzioni create dalle migrazioni del blocco 1. Supabase dà a ogni
 * funzione nuova di `public` EXECUTE per anon e authenticated (il banco lo riproduce):
 * qui si verifica che nessuna funzione nuova resti eseguibile da anon, che nessuna sia
 * SECURITY DEFINER o accetti un utente o una biografia, e che solo gli elenchi costanti
 * usati dai guard restino eseguibili da authenticated.
 *
 * Non riguarda le 17 funzioni che la migrazione di allineamento ricrea identiche a
 * quelle già in produzione: hanno i permessi che hanno già (elenco in
 * docs/SICUREZZA-SCRITTURE-ELENCO.md, punto 3).
 */
const NEW_FUNCTION_FILES = [
  '20260930115800_ai_token_usage.sql',
  '20260930120000_server_only_columns_and_reports.sql',
  '20260930120150_author_text_whitelist.sql',
];
const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

/** Nome e firma delle funzioni che questi file creano. */
function createdFunctions(): string[] {
  const names: string[] = [];
  for (const file of NEW_FUNCTION_FILES) {
    const text = readFileSync(join(MIGRATIONS, file), 'utf8');
    for (const match of text.match(/CREATE (?:OR REPLACE )?FUNCTION public\.[a-z_]+\(/g) ?? []) {
      const name = match.replace(/^CREATE (?:OR REPLACE )?FUNCTION public\./, '').slice(0, -1);
      if (!names.includes(name)) names.push(name);
    }
  }
  return names.sort();
}

/** Eseguibili da authenticated perché i guard li chiamano con la sessione di chi scrive. */
const AUTHENTICATED_ALLOWED = [
  'author_text_writable_statuses',
  'biographies_author_text_columns',
  'biographies_insert_defaults',
  'biographies_server_owned_columns',
  'profiles_insert_defaults',
  'profiles_server_owned_columns',
];

let db: PGlite;
beforeAll(async () => {
  db = await createTestDb();
}, 60_000);
afterAll(async () => {
  await db.close();
});

type Row = { proname: string; args: string; secdef: boolean; anon: boolean; authenticated: boolean; service: boolean; returns: string };
async function catalog(): Promise<Row[]> {
  const names = createdFunctions();
  const { rows } = await db.query<Row>(
    `select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as secdef,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
            has_function_privilege('service_role', p.oid, 'EXECUTE') as service,
            p.prorettype::regtype::text as returns
       from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1) order by 1`,
    [names]
  );
  return rows;
}

describe('funzioni nuove: permessi', () => {
  it('l\'elenco delle funzioni create è quello noto (se ne nasce una nuova va esaminata qui)', () => {
    expect(createdFunctions()).toEqual([
      'ai_author_token_usage',
      'author_text_child_guard',
      'author_text_writable_statuses',
      'biographies_author_text_columns',
      'biographies_guard_author_text',
      'biographies_guard_server_columns',
      'biographies_insert_defaults',
      'biographies_server_owned_columns',
      'profiles_guard_server_columns',
      'profiles_insert_defaults',
      'profiles_server_owned_columns',
    ]);
  });

  it('nessuna è SECURITY DEFINER', async () => {
    expect((await catalog()).filter((r) => r.secdef)).toEqual([]);
  });

  it('nessuna è eseguibile da anon', async () => {
    expect((await catalog()).filter((r) => r.anon).map((r) => r.proname)).toEqual([]);
  });

  it('authenticated esegue solo gli elenchi costanti, che non hanno parametri', async () => {
    const rows = await catalog();
    expect(rows.filter((r) => r.authenticated).map((r) => r.proname)).toEqual(AUTHENTICATED_ALLOWED);
    for (const r of rows.filter((x) => AUTHENTICATED_ALLOWED.includes(x.proname))) {
      expect(r.args).toBe('');
    }
  });

  it('ai_author_token_usage accetta un utente ma non è eseguibile né da anon né da authenticated', async () => {
    const row = (await catalog()).find((r) => r.proname === 'ai_author_token_usage')!;
    expect(row.args).toContain('p_user_id uuid');
    expect(row).toMatchObject({ secdef: false, anon: false, authenticated: false, service: true });
  });

  it('le funzioni dei trigger non sono eseguibili da chi scrive, ma i trigger scattano lo stesso', async () => {
    const rows = await catalog();
    for (const name of ['biographies_guard_server_columns', 'profiles_guard_server_columns', 'biographies_guard_author_text', 'author_text_child_guard']) {
      const r = rows.find((x) => x.proname === name)!;
      expect(r).toMatchObject({ returns: 'trigger', anon: false, authenticated: false });
    }
    const asAuthor = (sql: string) => as(db, 'authenticated', U.author, sql);
    expect(await errorOf(() => asAuthor(`update biographies set view_count = 9 where id = '${BIO.draft}'`))).toContain('server_only_column');
    expect(await errorOf(() => asAuthor(`update biographies set title = 'x' where id = '${BIO.published}'`))).toContain('author_text_locked');
  });

  it('senza EXECUTE per anon le scritture anonime vengono comunque rifiutate', async () => {
    const asAnon = (sql: string) => as(db, 'anon', null, sql);
    // Un UPDATE di anon non trova righe (nessuna policy le espone): 0 righe o un errore, mai una modifica.
    const changed = async (sql: string) => {
      let rows = 0;
      const err = await errorOf(async () => {
        rows = (await asAnon(sql)).length;
      });
      return err === null ? rows : 0;
    };
    expect(await changed(`update biographies set title = 'x' where id = '${BIO.draft}' returning id`)).toBe(0);
    expect(await changed(`update profiles set name = 'x' where id = '${U.author}' returning id`)).toBe(0);
    // Un INSERT di anon viene rifiutato (dal permesso sulla funzione del guard o dalle policy).
    expect(await errorOf(() => asAnon(`insert into biographies (user_id, title) values ('${U.fresh}', 'x')`))).not.toBeNull();
    expect(await errorOf(() => asAnon(`insert into profiles (id, email) values (gen_random_uuid(), 'a@b.c')`))).not.toBeNull();
    const [row] = (await db.query<{ title: string }>(`select title from biographies where id = '${BIO.draft}'`)).rows;
    expect(row.title).toBe('Bozza');
  });

  it('controllo negativo: senza i REVOKE, anon eseguirebbe le funzioni nuove', async () => {
    const bare = await createTestDb({ skip: ['20260930120150_author_text_whitelist.sql'] });
    try {
      const { rows } = await bare.query<{ anon: boolean }>(
        `select has_function_privilege('anon', 'public.profiles_server_owned_columns()'::regprocedure, 'EXECUTE') as anon`
      );
      // La migrazione 120000 la revoca; la 120150 non c'è: le sue funzioni non esistono.
      expect(rows[0].anon).toBe(false);
      const missing = await bare.query(`select 1 from pg_proc where proname = 'author_text_writable_statuses'`);
      expect(missing.rows).toHaveLength(0);
    } finally {
      await bare.close();
    }
  }, 60_000);
});
