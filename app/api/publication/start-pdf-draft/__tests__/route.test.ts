import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const getUser = vi.fn();
let db: FakeDb;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => db.client,
}));

const biographyHasCoverPhotoSpy = vi.fn();
vi.mock('@/lib/server/edition-cover-check', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/edition-cover-check')>(
    '@/lib/server/edition-cover-check'
  );
  return {
    biographyHasCoverPhoto: (...a: unknown[]) => {
      biographyHasCoverPhotoSpy(...a);
      return actual.biographyHasCoverPhoto(
        a[0] as Parameters<typeof actual.biographyHasCoverPhoto>[0],
        a[1] as string
      );
    },
  };
});

function seedOriginalWithCover() {
  db = createFakeDb({
    biographies: [
      {
        id: 'bio-1',
        user_id: 'user-1',
        status: 'final_version',
        record_script: 'Latn',
        translation_of: null,
      },
    ],
    biography_media: [{ id: 'cover', biography_id: 'bio-1', layout: 'cover' }],
  });
}

function seedEdition(originalHasCover: boolean) {
  db = createFakeDb({
    biographies: [
      {
        id: 'orig-1',
        user_id: 'user-1',
        status: 'published',
        record_script: 'Latn',
        translation_of: null,
      },
      {
        id: 'ed-1',
        user_id: 'user-1',
        status: 'final_version',
        record_script: 'Latn',
        translation_of: 'orig-1',
      },
    ],
    biography_media: originalHasCover
      ? [{ id: 'cover', biography_id: 'orig-1', layout: 'cover' }]
      : [{ id: 'gal', biography_id: 'orig-1', layout: 'full-page' }],
  });
}

describe('start-pdf-draft route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    seedOriginalWithCover();
  });

  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('transitions owned biography from final_version to pdf_draft', async () => {
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pdf_draft');
    expect(body.ok).toBe(true);
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'bio-1');
  });

  it('edizione con cover sull\'originale → 200 e chiama biographyHasCoverPhoto', async () => {
    seedEdition(true);
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'ed-1' }),
      })
    );
    expect(res.status).toBe(200);
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'ed-1');
    expect(db.tables.biographies.find((b) => b.id === 'ed-1')?.status).toBe('pdf_draft');
  });

  it('edizione senza cover sull\'originale → 400 missing_cover', async () => {
    seedEdition(false);
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'ed-1' }),
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_cover' });
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'ed-1');
    expect(db.tables.biographies.find((b) => b.id === 'ed-1')?.status).toBe('final_version');
  });
});
