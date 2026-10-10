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

const ORIG_ID = '10000000-0000-4000-8000-000000000001';
const ED_ID = '10000000-0000-4000-8000-000000000002';
const ORIG_ONLY = '10000000-0000-4000-8000-000000000003';
const AUTHOR_ID = '20000000-0000-4000-8000-000000000001';

beforeEach(() => {
  db = createFakeDb({
    biographies: [
      {
        id: ORIG_ID,
        user_id: AUTHOR_ID,
        translation_of: null,
        revised_at: '2026-03-01T00:00:00Z',
        published_at: '2026-01-01T00:00:00Z',
      },
      {
        id: ED_ID,
        user_id: AUTHOR_ID,
        translation_of: ORIG_ID,
        original_version_at: '2026-01-01T00:00:00Z',
      },
      {
        id: ORIG_ONLY,
        user_id: AUTHOR_ID,
        translation_of: null,
        revised_at: null,
        published_at: '2026-01-01T00:00:00Z',
      },
    ],
  });
  getUser.mockReturnValue({ id: AUTHOR_ID });
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
    const res = await POST(req(ED_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, originalVersionAt: '2026-03-01T00:00:00Z' });
    expect(db.tables.biographies.find((b) => b.id === ED_ID)?.original_version_at).toBe(
      '2026-03-01T00:00:00Z'
    );
  });

  it('403 se non proprietario', async () => {
    getUser.mockReturnValue({ id: 'other' });
    const res = await POST(req(ED_ID));
    expect(res.status).toBe(403);
  });

  it('409 se non è un\'edizione', async () => {
    const res = await POST(req(ORIG_ONLY));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'not_an_edition' });
  });

  it('404 not_found se editionId non è un UUID', async () => {
    const res = await POST(req('not-a-uuid'));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'not_found' });
  });
});
