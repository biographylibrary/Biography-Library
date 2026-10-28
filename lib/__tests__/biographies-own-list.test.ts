import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: Array<[string, ...unknown[]]> = [];
const result = { data: [{ id: 'orig' }], error: null as { message: string } | null };

vi.mock('@/lib/supabase', () => {
  const chain: Record<string, unknown> = {};
  const record = (name: string) => (...args: unknown[]) => {
    calls.push([name, ...args]);
    return name === 'order' ? Promise.resolve(result) : chain;
  };
  for (const name of ['from', 'select', 'eq', 'is', 'order']) chain[name] = record(name);
  return { supabase: chain };
});

import { fetchBiographies } from '@/lib/biographies';

beforeEach(() => {
  calls.length = 0;
});

/**
 * La dashboard, il tour e la creazione guidata trattano la prima scheda come «la biografia» dell'utente.
 * Se tra le schede ci sono le traduzioni, la più recente (spesso una traduzione) non deve prendere il
 * posto dell'originale.
 */
describe('fetchBiographies', () => {
  it('chiede solo gli originali dell\'utente, non le traduzioni', async () => {
    const out = await fetchBiographies('user-1');
    expect(out.data).toEqual([{ id: 'orig' }]);
    expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
    expect(calls).toContainEqual(['is', 'translation_of', null]);
  });

  it('restituisce l\'errore del database senza dati', async () => {
    result.error = { message: 'boom' };
    const out = await fetchBiographies('user-1');
    expect(out.error).toBe('boom');
    result.error = null;
  });
});
