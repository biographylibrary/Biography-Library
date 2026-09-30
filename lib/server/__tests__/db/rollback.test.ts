import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf } from './harness';

/**
 * Il ritorno indietro (supabase/rollback/20260930_security_rollback.sql) riporta
 * trigger, policy e funzioni com'erano prima delle due migrazioni di sicurezza:
 * il catalogo di un database "migrato e poi riportato indietro" è uguale a quello
 * di un database fermo all'allineamento. Non è una prova che il codice sia giusto:
 * è la prova che l'uscita di emergenza funziona davvero.
 */
const ALIGN = '20260930115900_align_biographies_profiles_triggers.sql';
const SECURITY = [
  '20260930120000_server_only_columns_and_reports.sql',
  '20260930120100_author_text_whitelist.sql',
  '20260930120200_publication_records.sql',
];
const ROLLBACK = 'supabase/rollback/20260930_security_rollback.sql';

let before: PGlite; // fermo all'allineamento: com'è la produzione oggi
let rolledBack: PGlite; // con la sicurezza, poi riportato indietro
let secured: PGlite; // con la sicurezza (controllo negativo)

beforeAll(async () => {
  before = await createTestDb({ only: [ALIGN] });
  rolledBack = await createTestDb({ only: [ALIGN, ...SECURITY], extraFiles: [ROLLBACK] });
  secured = await createTestDb({ only: [ALIGN, ...SECURITY] });
}, 120_000);

afterAll(async () => {
  await Promise.all([before.close(), rolledBack.close(), secured.close()]);
});

// Il registro delle impronte è una tabella nuova che il ritorno indietro lascia: fuori dal confronto.
const catalog = async (db: PGlite) => {
  const q = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;
  return {
    triggers: await q(`
      select c.relname as tabella, t.tgname as nome
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not t.tgisinternal and c.relname <> 'publication_records'
      order by 1, 2`),
    policies: await q(`
      select tablename, policyname, cmd, roles::text as roles, qual, with_check
      from pg_policies where schemaname = 'public' and tablename <> 'publication_records'
      order by 1, 2`),
    functions: await q(`
      select p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' order by 1, 2`),
  };
};

describe('ritorno indietro della migrazione di sicurezza', () => {
  it('il catalogo torna uguale a quello precedente (trigger, policy, funzioni)', async () => {
    expect(await catalog(rolledBack)).toEqual(await catalog(before));
  });

  it('controllo negativo: senza il ritorno indietro il catalogo è diverso', async () => {
    const withSecurity = await catalog(secured);
    const baseline = await catalog(before);
    expect(withSecurity.triggers).not.toEqual(baseline.triggers);
    expect(withSecurity.policies).not.toEqual(baseline.policies);
    expect(withSecurity.functions).not.toEqual(baseline.functions);
  });

  it('dopo il ritorno indietro tornano le scritture di prima (è l\'uscita d\'emergenza)', async () => {
    const asAuthor = (sql: string, params: unknown[] = []) => as(rolledBack, 'authenticated', U.author, sql, params);
    expect(await errorOf(() => asAuthor(`update biographies set final_version = 'x' where id = $1`, [BIO.published]))).toBeNull();
    expect(await errorOf(() => asAuthor(`update biographies set view_count = 5 where id = $1`, [BIO.draft]))).toBeNull();
    expect(
      await errorOf(() =>
        as(rolledBack, 'authenticated', U.author, `insert into moderation_reports (biography_id, reporter_id, report_type) values ($1, $2, 'x')`, [BIO.draft, U.author])
      )
    ).toBeNull();
    expect(await errorOf(() => as(rolledBack, 'anon', null, `insert into moderation_reports (biography_id, report_type) values ($1, 'x')`, [BIO.draft]))).toBeNull();
    expect(
      await errorOf(() =>
        as(rolledBack, 'authenticated', U.fresh, `update profiles set role = 'user' where id = $1`, [U.fresh])
      )
    ).toBeNull();
  });

  it('prima del ritorno indietro le stesse scritture erano rifiutate', async () => {
    const asAuthor = (sql: string, params: unknown[] = []) => as(secured, 'authenticated', U.author, sql, params);
    expect(await errorOf(() => asAuthor(`update biographies set final_version = 'x' where id = $1`, [BIO.published]))).toContain('author_text_locked');
    expect(await errorOf(() => asAuthor(`update biographies set view_count = 5 where id = $1`, [BIO.draft]))).toContain('server_only_column');
  });

  it('è una transazione sola e non tocca la tabella delle impronte', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(ROLLBACK, 'utf8');
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    expect(sql).not.toMatch(/^\s*DROP TABLE/m);
  });
});
