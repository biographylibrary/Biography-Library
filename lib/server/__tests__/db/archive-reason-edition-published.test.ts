import { describe, expect, it } from 'vitest';
import { BIO, as, createTestDb, errorOf } from './harness';

const INSERT = `
  insert into public.archive_package_versions
    (biography_id, um_id, version_number, generated_at, manifest_sha256, reason, status)
  values ($1, 'UM-TEST', $2, now(), $3, $4, 'stored')
`;

describe('migrazione archive_reason_edition_published', () => {
  it('accetta edition_published e le quattro ragioni precedenti; rifiuta un motivo inventato', async () => {
    const db = await createTestDb();
    const hash = 'a'.repeat(64);

    const reasons = [
      'publication',
      'provisional_expired',
      'republication',
      'data_protection',
      'edition_published',
    ] as const;
    for (let i = 0; i < reasons.length; i += 1) {
      const err = await errorOf(() =>
        as(db, 'service_role', null, INSERT, [BIO.published, i + 1, hash, reasons[i]])
      );
      expect(err).toBeNull();
    }

    const bad = await errorOf(() =>
      as(db, 'service_role', null, INSERT, [BIO.published, 99, hash, 'invented_reason'])
    );
    expect(bad).toMatch(/archive_package_versions_reason_check|violates check/i);
  });

  it('senza la migrazione edition_published non è accettato', async () => {
    const db = await createTestDb({
      skip: ['20261013140000_archive_reason_edition_published.sql'],
    });
    const hash = 'b'.repeat(64);
    const denied = await errorOf(() =>
      as(db, 'service_role', null, INSERT, [BIO.published, 1, hash, 'edition_published'])
    );
    expect(denied).toMatch(/archive_package_versions_reason_check|violates check/i);

    const ok = await errorOf(() =>
      as(db, 'service_role', null, INSERT, [BIO.published, 1, hash, 'publication'])
    );
    expect(ok).toBeNull();
  });
});
