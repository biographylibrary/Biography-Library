import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const purge = vi.fn();

vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: (...a: unknown[]) => purge(...(a as [])),
}));

import { setAiFeaturesEnabled } from '@/lib/server/ai-features-preference';

let db: FakeDb;

beforeEach(() => {
  purge.mockReset();
  purge.mockResolvedValue(undefined);
  db = createFakeDb({
    profiles: [{ id: 'user-1', ai_features_enabled: true }],
    biographies: [
      { id: 'bio-1', user_id: 'user-1', translation_of: null },
      { id: 'bio-edition', user_id: 'user-1', translation_of: 'bio-1' },
      { id: 'other', user_id: 'other-user', translation_of: null },
    ],
  });
});

describe('setAiFeaturesEnabled', () => {
  it('accende solo il flag, senza purge', async () => {
    db.tables.profiles[0].ai_features_enabled = false;
    const result = await setAiFeaturesEnabled(db.client, 'user-1', true);
    expect(result).toEqual({ ok: true, enabled: true, purgedBiographyIds: [] });
    expect(db.tables.profiles[0].ai_features_enabled).toBe(true);
    expect(purge).not.toHaveBeenCalled();
  });

  it('spegne il flag prima del purge e chiama purge su ogni biografia dell’utente (edizioni incluse)', async () => {
    const order: string[] = [];
    db = createFakeDb(
      {
        profiles: [{ id: 'user-1', ai_features_enabled: true }],
        biographies: [
          { id: 'bio-1', user_id: 'user-1', translation_of: null },
          { id: 'bio-edition', user_id: 'user-1', translation_of: 'bio-1' },
        ],
      },
      {
        onUpdate: (table, patch) => {
          if (table === 'profiles' && patch.ai_features_enabled === false) {
            order.push('flag_false');
          }
        },
      }
    );
    purge.mockImplementation(async (_c: unknown, id: string) => {
      order.push(`purge:${id}`);
    });

    const result = await setAiFeaturesEnabled(db.client, 'user-1', false);
    expect(result.ok).toBe(true);
    expect(db.tables.profiles[0].ai_features_enabled).toBe(false);
    expect(order[0]).toBe('flag_false');
    expect(order.slice(1).sort()).toEqual(['purge:bio-1', 'purge:bio-edition']);
    expect(purge).toHaveBeenCalledTimes(2);
  });

  it('se un purge fallisce lascia il flag a false e segnala memory_purge_failed', async () => {
    purge.mockImplementation(async (_c: unknown, id: string) => {
      if (id === 'bio-edition') throw new Error('boom');
    });

    const result = await setAiFeaturesEnabled(db.client, 'user-1', false);
    expect(result).toMatchObject({
      ok: false,
      error: 'memory_purge_failed',
      enabled: false,
      failedBiographyIds: ['bio-edition'],
    });
    expect(db.tables.profiles[0].ai_features_enabled).toBe(false);
  });

  it('prova di rottura: senza chiamata a purgeAgentMemoryForBiography lo spegnimento non è completo', async () => {
    // Se qualcuno rimuove il purge, questo test deve fallire: dopo disable
    // ci aspettiamo almeno una chiamata per biografia.
    await setAiFeaturesEnabled(db.client, 'user-1', false);
    expect(purge.mock.calls.map((c) => c[1]).sort()).toEqual(['bio-1', 'bio-edition']);
  });
});
