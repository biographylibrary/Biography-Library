import { describe, expect, it } from 'vitest';
import { as, createTestDb, errorOf, U, BIO } from './harness';

describe('migrazione analysis_jobs', () => {
  it('carica la tabella; solo service_role può scrivere; indice unico su running', async () => {
    const db = await createTestDb();
    const insertSql = `
      insert into public.analysis_jobs (biography_id, kind, status)
      values ($1, 'screening', 'running')
      returning id
    `;
    const denied = await errorOf(() => as(db, 'authenticated', U.author, insertSql, [BIO.draft]));
    expect(denied).toMatch(/permission denied|violates/i);

    const rows = await as<{ id: string }>(db, 'service_role', null, insertSql, [BIO.draft]);
    expect(rows).toHaveLength(1);

    const clash = await errorOf(() =>
      as(db, 'service_role', null, insertSql, [BIO.draft])
    );
    expect(clash).toMatch(/unique|duplicate/i);
  });
});
