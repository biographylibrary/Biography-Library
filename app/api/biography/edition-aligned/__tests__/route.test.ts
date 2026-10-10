import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

let db: FakeDb;
const getUser = vi.fn();

vi.mock('@/lib/server/onboarding-api-auth', () => ({
  getAuthenticatedUser: async () => {
    const user = getUser();
    if (!user) return { error: 'Authentication required', status: 401 };
    return { user, anonClient: db.client };
  },
}));
vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => db.client,
}));

import { POST } from '@/app/api/biography/edition-aligned/route';

beforeEach(() => {
  db = createFakeDb({
    biographies: [
      {
        id: 'orig-1',
        user_id: 'author-1',
        translation_of: null,
        revised_at: '2026-03-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ed-1',
        user_id: 'author-1',
        translation_of: 'orig-1',
        original_version_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'orig-only',
        user_id: 'author-1',
        translation_of: null,
        revised_at: null,
        published_at: '2026-01-01T00:00:00Z',
      },
    ],
  });
  getUser.mockReturnValue({ id: 'author-1' });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

const req = (editionId: string) =>
  new NextRequest('http://localhost/api/biography/edition-aligned', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt' },
    body: JSON.stringify({ editionId }),
  });

describe('POST /api/biography/edition-aligned', () => {
  it('solo proprietario su edizione', async () => {
    const res = await POST(req('ed-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, originalVersionAt: '2026-03-01T00:00:00Z' });
    expect(db.tables.biographies.find((b) => b.id === 'ed-1')?.original_version_at).toBe(
      '2026-03-01T00:00:00Z'
    );
  });

  it('403 se non proprietario', async () => {
    getUser.mockReturnValue({ id: 'other' });
    const res = await POST(req('ed-1'));
    expect(res.status).toBe(403);
  });

  it('409 se non è un\'edizione', async () => {
    const res = await POST(req('orig-only'));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'not_an_edition' });
  });
});
