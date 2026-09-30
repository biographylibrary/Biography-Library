import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Registro delle impronte: lo leggono e lo scrivono solo il ruolo di servizio e
 * gli script; nessun utente, nemmeno lo staff, dal browser.
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

const FP = 'a'.repeat(64);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

const insertScreening = (bio: string) =>
  asService(
    `insert into publication_records (biography_id, kind, fingerprint, verdict, scope, examined_chars, source_chars)
     values ($1, 'screening', $2, 'passed', 'full', 100, 100) returning id`,
    [bio, FP]
  );

describe('publication_records: solo il servizio', () => {
  it('il servizio scrive e legge', async () => {
    const [row] = await insertScreening(BIO.underReview);
    expect(row).toBeTruthy();
    const read = await asService(`select kind, verdict from publication_records where biography_id = $1`, [BIO.underReview]);
    expect(read).toEqual([{ kind: 'screening', verdict: 'passed' }]);
  });

  it.each([
    ['author', U.author],
    ['staff', U.staff],
  ])('%s non legge, non scrive, non cancella', async (_name, user) => {
    await insertScreening(BIO.underReview);
    const run = (sql: string, params: unknown[] = []) => as(db, 'authenticated', user, sql, params);
    expect(await errorOf(() => run(`select * from publication_records`))).toContain('permission denied');
    expect(
      await errorOf(() =>
        run(
          `insert into publication_records (biography_id, kind, fingerprint, verdict, scope, examined_chars) values ($1, 'screening', $2, 'passed', 'full', 1)`,
          [BIO.underReview, FP]
        )
      )
    ).toContain('permission denied');
    expect(await errorOf(() => run(`update publication_records set verdict = 'flagged'`))).toContain('permission denied');
    expect(await errorOf(() => run(`delete from publication_records`))).toContain('permission denied');
  });

  it('un utente anonimo non tocca nulla', async () => {
    expect(await errorOf(() => as(db, 'anon', null, `select * from publication_records`))).toContain('permission denied');
  });
});

describe('publication_records: forma delle righe', () => {
  it('rifiuta un\'impronta che non è SHA-256 esadecimale', async () => {
    const err = await errorOf(() =>
      asService(
        `insert into publication_records (biography_id, kind, fingerprint, verdict, scope, examined_chars) values ($1, 'screening', 'non-un-hash', 'passed', 'full', 1)`,
        [BIO.underReview]
      )
    );
    expect(err).toContain('fingerprint');
  });

  it('una riga di screening ha esito, ambito e caratteri esaminati', async () => {
    const err = await errorOf(() =>
      asService(`insert into publication_records (biography_id, kind, fingerprint) values ($1, 'screening', $2)`, [BIO.underReview, FP])
    );
    expect(err).toContain('publication_records_screening_shape');
  });

  it('una riga di pubblicazione ha modo ed esito', async () => {
    const err = await errorOf(() =>
      asService(`insert into publication_records (biography_id, kind, fingerprint) values ($1, 'publication', $2)`, [BIO.underReview, FP])
    );
    expect(err).toContain('publication_records_publication_shape');
    const ok = await asService(
      `insert into publication_records (biography_id, kind, fingerprint, mode, actor_id, outcome)
       values ($1, 'publication', $2, 'forced', $3, 'pending') returning id`,
      [BIO.underReview, FP, U.staff]
    );
    expect(ok).toHaveLength(1);
  });

  it('modi ed esiti fuori elenco sono rifiutati', async () => {
    const err = await errorOf(() =>
      asService(
        `insert into publication_records (biography_id, kind, fingerprint, mode, outcome) values ($1, 'publication', $2, 'di-nascosto', 'pending')`,
        [BIO.underReview, FP]
      )
    );
    expect(err).toContain('check');
  });

  it('segue la scheda: eliminandola si eliminano le righe', async () => {
    await insertScreening(BIO.draft);
    await as(db, 'authenticated', U.author, `delete from biographies where id = $1`, [BIO.draft]);
    const left = await asService(`select 1 from publication_records where biography_id = $1`, [BIO.draft]);
    expect(left).toHaveLength(0);
  });
});
