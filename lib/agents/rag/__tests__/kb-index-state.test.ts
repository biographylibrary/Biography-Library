import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

vi.mock('@/lib/help/manual-meta.generated', () => ({
  MANUAL_META: {
    version: '1.13',
    date: '2026-10-15',
    hash: 'abc123',
    languages: { en: { version: '1.13', date: '2026-10-15', hash: 'abc123' } },
  },
}));

import {
  isKbIndexCurrent,
  tryAcquireKbReseedLock,
  releaseKbReseedLock,
  KB_RESEED_LOCK_TTL_MS,
} from '@/lib/agents/rag/kb-index-state';

let db: FakeDb;

beforeEach(() => {
  db = createFakeDb({ kb_index_state: [] });
});

describe('kb_index_state lock', () => {
  it('acquisisce il lock se assente', async () => {
    expect(await tryAcquireKbReseedLock(db.client, 'en')).toBe(true);
    expect(db.tables.kb_index_state[0].reseed_locked_until).toBeTruthy();
  });

  it('rifiuta un secondo lock finché non scade', async () => {
    const now = new Date('2026-10-15T12:00:00Z');
    expect(await tryAcquireKbReseedLock(db.client, 'en', now)).toBe(true);
    expect(await tryAcquireKbReseedLock(db.client, 'en', now)).toBe(false);
  });

  it('dopo TTL scaduto il lock si può riprendere', async () => {
    const t0 = new Date('2026-10-15T12:00:00Z');
    expect(await tryAcquireKbReseedLock(db.client, 'en', t0)).toBe(true);
    const afterTtl = new Date(t0.getTime() + KB_RESEED_LOCK_TTL_MS + 1000);
    expect(await tryAcquireKbReseedLock(db.client, 'en', afterTtl)).toBe(true);
  });

  it('release aggiorna hash e toglie il lock', async () => {
    await tryAcquireKbReseedLock(db.client, 'en');
    await releaseKbReseedLock(db.client, 'en', { version: '1.13', content_hash: 'abc123' });
    const row = db.tables.kb_index_state[0];
    expect(row.reseed_locked_until).toBeNull();
    expect(row.content_hash).toBe('abc123');
    expect(isKbIndexCurrent(row as never)).toBe(true);
  });
});
