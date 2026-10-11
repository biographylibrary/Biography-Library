import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const resolveBiographyId = vi.fn();
const verifyBiographyViewAccess = vi.fn();
const resolveMediaOwnerId = vi.fn();
const createSignedUrl = vi.fn();

type MediaRow = {
  id: string;
  biography_id: string;
  file_url: string;
  caption: string | null;
  layout: string;
  display_order: number;
};

type CaptionRow = { biography_id: string; media_id: string; caption: string | null };

const state: {
  media: MediaRow[];
  captions: CaptionRow[];
} = {
  media: [],
  captions: [],
};

vi.mock('@/lib/server/biography-view-access', () => ({
  resolveBiographyId: (...a: unknown[]) => resolveBiographyId(...a),
  verifyBiographyViewAccess: (...a: unknown[]) => verifyBiographyViewAccess(...a),
}));

vi.mock('@/lib/edition-media-owner', () => ({
  resolveMediaOwnerId: (...a: unknown[]) => resolveMediaOwnerId(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      let inLayouts: string[] | null = null;
      chain.select = () => chain;
      chain.eq = (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      };
      chain.in = (_col: string, layouts: string[]) => {
        inLayouts = layouts;
        return chain;
      };
      chain.order = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (table === 'biography_media') {
          const owner = filters.biography_id as string;
          const data = state.media.filter(
            (r) =>
              r.biography_id === owner &&
              (inLayouts == null || inLayouts.includes(r.layout))
          );
          return Promise.resolve(resolve({ data, error: null }));
        }
        if (table === 'biography_edition_captions') {
          const bioId = filters.biography_id as string;
          const data = state.captions.filter((c) => c.biography_id === bioId);
          return Promise.resolve(resolve({ data, error: null }));
        }
        throw new Error(`unexpected table ${table}`);
      };
      return chain;
    },
    storage: {
      from: () => ({
        createSignedUrl: (...a: unknown[]) => createSignedUrl(...a),
      }),
    },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import { GET } from '@/app/api/biography/[id]/gallery-photos/route';

const ED_ID = 'ed-1';
const ORIG_ID = 'orig-1';
const MEDIA_A = 'media-a';
const MEDIA_B = 'media-b';

function req(id: string) {
  return new NextRequest(`http://localhost/api/biography/${id}/gallery-photos`);
}

const call = (id: string) => GET(req(id), { params: { id } });

beforeEach(() => {
  vi.clearAllMocks();
  state.media = [
    {
      id: MEDIA_A,
      biography_id: ORIG_ID,
      file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/a.jpg',
      caption: 'didascalia originale A',
      layout: 'full-page',
      display_order: 1,
    },
    {
      id: MEDIA_B,
      biography_id: ORIG_ID,
      file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/b.jpg',
      caption: 'didascalia originale B',
      layout: 'two-vertical',
      display_order: 2,
    },
  ];
  state.captions = [];
  resolveBiographyId.mockImplementation(async (_c: unknown, id: string) => id);
  verifyBiographyViewAccess.mockResolvedValue({ ok: true });
  resolveMediaOwnerId.mockImplementation(async (_c: unknown, id: string) => id);
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed.example/${path}` },
    error: null,
  }));
});

describe('GET /api/biography/[id]/gallery-photos captions', () => {
  it('edizione leggibile: foto dal media owner, didascalie solo da biography_edition_captions', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    state.captions = [
      { biography_id: ED_ID, media_id: MEDIA_A, caption: '   ' },
      { biography_id: ED_ID, media_id: MEDIA_B, caption: '  caption edizione B  ' },
    ];

    const res = await call(ED_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toHaveLength(2);
    expect(body.photos[0]).toMatchObject({
      id: MEDIA_A,
      caption: null,
      layout: 'full-page',
    });
    expect(body.photos[1]).toMatchObject({
      id: MEDIA_B,
      caption: 'caption edizione B',
      layout: 'two-vertical',
    });
    expect(body.photos.every((p: { caption: string | null }) => p.caption !== 'didascalia originale A')).toBe(
      true
    );
    expect(body.photos.every((p: { caption: string | null }) => p.caption !== 'didascalia originale B')).toBe(
      true
    );
  });

  it('edizione non leggibile: Access denied', async () => {
    verifyBiographyViewAccess.mockResolvedValue({ ok: false, status: 403 });
    const res = await call(ED_ID);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Access denied' });
  });

  it('originale: usa le proprie didascalie su biography_media', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    const res = await call(ORIG_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photos).toEqual([
      expect.objectContaining({ id: MEDIA_A, caption: 'didascalia originale A' }),
      expect.objectContaining({ id: MEDIA_B, caption: 'didascalia originale B' }),
    ]);
  });
});
