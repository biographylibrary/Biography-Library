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

import { POST } from '@/app/api/biography/create-edition/route';

function seed() {
  db = createFakeDb({
    biographies: [
      {
        id: 'orig-1',
        user_id: 'author-1',
        translation_of: null,
        status: 'published',
        is_frozen: false,
        biography_type: 'autobiography',
        title: 'Titolo',
        author_name: 'Anna',
        subject_name: null,
        name_as_written: 'Anna',
        biography_mode: 'freeflow',
        content: {},
        content_freeflow: '<p>Ciao</p>',
        narrative_order: [],
        visibility: 'public',
        rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        rights_chosen_at: '2026-01-01T00:00:00Z',
        rights_holder: 'Anna',
        consent_basis: null,
        consent_recorded_at: null,
        record_language_tag: 'it',
        record_script: 'Latn',
        record_direction: 'ltr',
        revised_at: null,
        published_at: '2026-01-10T00:00:00Z',
      },
    ],
  });
}

const req = (body: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/biography/create-edition', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  seed();
  getUser.mockReturnValue({ id: 'author-1' });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

describe('POST /api/biography/create-edition', () => {
  it('201 con copy', async () => {
    const res = await POST(req({ originalId: 'orig-1', languageTag: 'en', startFrom: 'copy' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeTruthy();
    const row = db.tables.biographies.find((b) => b.id === json.id) as Record<string, unknown>;
    expect(row.translation_of).toBe('orig-1');
    expect(row.original_version_at).toBe('2026-01-10T00:00:00Z');
    expect(row.um_id).toBeUndefined();
  });

  it('400 invalid_language', async () => {
    const res = await POST(req({ originalId: 'orig-1', languageTag: 'not-a-lang', startFrom: 'blank' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_language' });
  });

  it('403 forbidden', async () => {
    getUser.mockReturnValue({ id: 'other' });
    const res = await POST(req({ originalId: 'orig-1', languageTag: 'en', startFrom: 'blank' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'forbidden' });
  });
});
