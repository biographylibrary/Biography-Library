import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

let db: FakeDb;
const getUser = vi.fn();
const purge = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => db.client,
}));
vi.mock('@/lib/agents/purge-agent-memory', () => ({
  purgeAgentMemoryForBiography: (...a: unknown[]) => purge(...(a as [])),
}));

import { POST } from '@/app/api/profile/ai-features/route';

const req = (body: unknown, auth = 'Bearer jwt') =>
  new NextRequest('http://localhost/api/profile/ai-features', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
    body: JSON.stringify(body),
  });

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  purge.mockReset();
  purge.mockResolvedValue(undefined);
  db = createFakeDb({
    profiles: [{ id: 'user-1', ai_features_enabled: true }],
    biographies: [
      { id: 'bio-1', user_id: 'user-1' },
      { id: 'bio-2', user_id: 'user-1' },
    ],
  });
});

describe('POST /api/profile/ai-features', () => {
  it('401 senza sessione', async () => {
    expect((await POST(req({ enabled: false }, ''))).status).toBe(401);
  });

  it('400 se enabled non è boolean', async () => {
    expect((await POST(req({ enabled: 'no' }))).status).toBe(400);
  });

  it('spegne e fa purge di tutte le biografie', async () => {
    const res = await POST(req({ enabled: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, enabled: false });
    expect(db.tables.profiles[0].ai_features_enabled).toBe(false);
    expect(purge).toHaveBeenCalledTimes(2);
  });

  it('purge fallito: 500 memory_purge_failed, flag resta false', async () => {
    purge.mockRejectedValueOnce(new Error('fail'));
    const res = await POST(req({ enabled: false }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: 'memory_purge_failed', enabled: false });
    expect(db.tables.profiles[0].ai_features_enabled).toBe(false);
  });

  it('prova di rottura: la route deve chiamare purge quando spegne', async () => {
    await POST(req({ enabled: false }));
    expect(purge).toHaveBeenCalled();
  });

  it('accensione: 200 senza purge', async () => {
    db.tables.profiles[0].ai_features_enabled = false;
    const res = await POST(req({ enabled: true }));
    expect(res.status).toBe(200);
    expect(db.tables.profiles[0].ai_features_enabled).toBe(true);
    expect(purge).not.toHaveBeenCalled();
  });
});
