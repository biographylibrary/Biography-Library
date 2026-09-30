import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Prove di integrazione su un database locale in memoria (mai la produzione):
 * l'autore, con la propria sessione, non può scrivere le colonne riservate al
 * server; il ruolo di servizio sì.
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

const asAuthor = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'authenticated', U.author, sql, params);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

describe('biographies: l\'autore non salta lo screening', () => {
  it('non pubblica con un update diretto', async () => {
    const err = await errorOf(() =>
      asAuthor(`update biographies set status = 'published' where id = $1`, [BIO.draft])
    );
    expect(err).toContain('server_only_column');
    const [row] = await asService<{ status: string }>(`select status from biographies where id = $1`, [BIO.draft]);
    expect(row.status).toBe('draft');
  });

  it.each([
    ['ai_screening_status', `ai_screening_status = 'passed'`],
    ['final_pdf_approved_at', `final_pdf_approved_at = now()`],
    ['published_at', `published_at = now()`],
    ['reviewed_by', `reviewed_by = '${U.staff}'`],
    ['is_frozen', `is_frozen = true`],
    ['next_chapter_available_at', `next_chapter_available_at = '2000-01-01'`],
    ['provisional_until', `provisional_until = now()`],
    ['view_count', `view_count = 999999`],
    ['is_featured', `is_featured = true`],
    ['created_at', `created_at = '2000-01-01'`],
    ['id', `id = gen_random_uuid()`],
    ['user_id', `user_id = '${U.other}'`],
  ])('non scrive %s', async (_name, assignment) => {
    const err = await errorOf(() => asAuthor(`update biographies set ${assignment} where id = $1`, [BIO.draft]));
    expect(err).toContain('server_only_column');
  });

  it('non crea una biografia già pubblicata', async () => {
    const err = await errorOf(() =>
      asAuthor(`insert into biographies (user_id, title, status) values ($1, 'x', 'published')`, [U.author])
    );
    expect(err).toContain('server_only_column');
  });

  it('non crea una biografia con colonne riservate diverse dal predefinito', async () => {
    const err = await errorOf(() =>
      asAuthor(
        `insert into biographies (user_id, title, ai_screening_status, created_at) values ($1, 'x', 'passed', '2000-01-01')`,
        [U.author]
      )
    );
    expect(err).toContain('ai_screening_status');
    expect(err).toContain('created_at');
  });

  it('crea una bozza normale e ne modifica il testo', async () => {
    const [created] = await asAuthor<{ id: string; status: string }>(
      `insert into biographies (user_id, title) values ($1, 'Nuova') returning id, status`,
      [U.author]
    );
    expect(created.status).toBe('draft');
    await asAuthor(`update biographies set title = 'Cambiata', content = '{"a":1}'::jsonb where id = $1`, [created.id]);
  });

  it('percorre gli stati d\'autore e torna indietro', async () => {
    for (const next of ['sections_complete', 'final_version', 'draft']) {
      await asAuthor(`update biographies set status = $2 where id = $1`, [BIO.draft, next]);
    }
  });

  it.each([
    ['in revisione', BIO.underReview],
    ['sospesa in attesa di verifica', BIO.suspended],
    ['pubblicata', BIO.published],
  ])('non riporta a draft una biografia %s', async (_label, id) => {
    const err = await errorOf(() => asAuthor(`update biographies set status = 'draft' where id = $1`, [id]));
    expect(err).toContain('server_only_column: status');
  });

  it('non porta a final_version da uno stato che l\'autore non può lasciare', async () => {
    const err = await errorOf(() =>
      asAuthor(`update biographies set status = 'final_version' where id = $1`, [BIO.underReview])
    );
    expect(err).toContain('server_only_column: status');
  });

  it('una biografia rimossa non è nemmeno visibile all\'autore: nessuna riga modificata', async () => {
    const rows = await asAuthor(`update biographies set status = 'draft' where id = $1 returning id`, [BIO.removed]);
    expect(rows).toHaveLength(0);
    const [row] = await asService<{ status: string }>(`select status from biographies where id = $1`, [BIO.removed]);
    expect(row.status).toBe('removed');
  });

  it('un update che rimanda una colonna riservata con lo stesso valore non viene rifiutato', async () => {
    await asAuthor(
      `update biographies set title = 'Stesso', is_frozen = false, ai_screening_status = 'pending', status = 'draft' where id = $1`,
      [BIO.draft]
    );
  });

  it('nemmeno lo staff, con la sessione del browser, scrive le colonne riservate', async () => {
    const err = await errorOf(() =>
      as(db, 'authenticated', U.staff, `update biographies set status = 'published' where id = $1`, [BIO.underReview])
    );
    expect(err).toContain('server_only_column');
  });

  it('il ruolo di servizio può fare tutte queste operazioni', async () => {
    await asService(
      `update biographies set status = 'published', ai_screening_status = 'passed', published_at = now(),
         final_pdf_approved_at = now(), is_frozen = true, view_count = 5, created_at = '2000-01-01'
       where id = $1`,
      [BIO.draft]
    );
    await asService(`update biographies set status = 'draft' where id = $1`, [BIO.removed]);
    await asService(
      `insert into biographies (user_id, title, status, ai_screening_status) values ($1, 'p', 'published', 'passed')`,
      [U.author]
    );
  });

  it('gli script collegati direttamente al database (postgres) passano', async () => {
    await as(db, 'postgres', null, `update biographies set status = 'published' where id = $1`, [BIO.draft]);
  });
});

describe('profiles: nessuno si assegna un ruolo o salta la lista d\'attesa', () => {
  it.each([
    ['role', `role = 'super_admin'`],
    ['role admin', `role = 'admin'`],
    ['account_status', `account_status = 'active'`],
    ['waitlist_granted_at', `waitlist_granted_at = now()`],
    ['legal_declaration_accepted_at', `legal_declaration_accepted_at = now()`],
    ['legal_declaration_type', `legal_declaration_type = 'x'`],
    ['legal_declaration_version', `legal_declaration_version = '1999'`],
    ['welcome_email_sent_at', `welcome_email_sent_at = now()`],
  ])('non scrive %s', async (_name, assignment) => {
    const err = await errorOf(() => as(db, 'authenticated', U.waitlist, `update profiles set ${assignment} where id = $1`, [U.waitlist]));
    expect(err).toContain('server_only_column');
  });

  it('continua a scrivere le proprie preferenze', async () => {
    await as(db, 'authenticated', U.author, `update profiles set name = 'Anna', language = 'it', ui_font_size = 18, ai_features_enabled = true where id = $1`, [U.author]);
  });

  it('non inserisce un profilo con ruolo diverso da user', async () => {
    const newId = '00000000-0000-0000-0000-00000000d001';
    const err = await errorOf(() =>
      as(db, 'authenticated', newId, `insert into profiles (id, email, role) values ($1, 'n@test', 'admin')`, [newId])
    );
    expect(err).toContain('server_only_column');
  });

  it('inserisce un profilo normale', async () => {
    const newId = '00000000-0000-0000-0000-00000000d002';
    await as(db, 'authenticated', newId, `insert into profiles (id, email) values ($1, 'n2@test')`, [newId]);
  });

  it('il ruolo di servizio può assegnare ruoli e attivare l\'account', async () => {
    await asService(`update profiles set role = 'admin', account_status = 'active', waitlist_granted_at = now() where id = $1`, [U.waitlist]);
  });
});

describe('moderation_reports: nessuna scrittura diretta dal browser', () => {
  it('l\'autore non inserisce un rapporto di screening', async () => {
    const err = await errorOf(() =>
      asAuthor(
        `insert into moderation_reports (biography_id, reporter_id, report_type, origin, status, ai_analysis)
         values ($1, $2, 'level1_content', 'screening', 'decided', '{}'::jsonb)`,
        [BIO.draft, U.author]
      )
    );
    expect(err).toContain('row-level security');
  });

  it('nemmeno un utente anonimo inserisce un rapporto', async () => {
    const err = await errorOf(() =>
      as(db, 'anon', null, `insert into moderation_reports (biography_id, report_type) values ($1, 'other')`, [BIO.published])
    );
    expect(err).toContain('row-level security');
  });

  it('il ruolo di servizio inserisce il rapporto (è la rotta /api/moderation/report)', async () => {
    await asService(
      `insert into moderation_reports (biography_id, reporter_id, report_type, origin) values ($1, null, 'other', 'in_app')`,
      [BIO.published]
    );
  });

  it('l\'autore non modifica né cancella un rapporto che riguarda la sua biografia', async () => {
    const [report] = await asService<{ id: string }>(
      `insert into moderation_reports (biography_id, report_type, origin, status) values ($1, 'other', 'in_app', 'unassigned') returning id`,
      [BIO.published]
    );
    const updated = await asAuthor(`update moderation_reports set status = 'decided', decision = 'no_action' where id = $1 returning id`, [report.id]);
    expect(updated).toHaveLength(0);
    const deleted = await asAuthor(`delete from moderation_reports where id = $1 returning id`, [report.id]);
    expect(deleted).toHaveLength(0);
    const [still] = await asService<{ status: string }>(`select status from moderation_reports where id = $1`, [report.id]);
    expect(still.status).toBe('unassigned');
  });
});
