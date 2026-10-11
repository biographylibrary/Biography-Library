import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const resolveBiographyId = vi.fn();
const verifyBiographyViewAccess = vi.fn();
const resolveMediaOwnerId = vi.fn();
const createSignedUrl = vi.fn();

type MediaRow = { file_url: string; layout: string; biography_id: string };

const state: {
  media: MediaRow[];
  lastInLayouts: string[] | null;
  lastEqBiographyId: string | null;
} = {
  media: [],
  lastInLayouts: null,
  lastEqBiographyId: null,
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
      if (table !== 'biography_media') throw new Error(`unexpected table ${table}`);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (col: string, val: string) => {
        if (col === 'biography_id') state.lastEqBiographyId = val;
        return chain;
      };
      chain.in = (_col: string, layouts: string[]) => {
        state.lastInLayouts = [...layouts];
        return chain;
      };
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        const owner = state.lastEqBiographyId;
        const layouts = state.lastInLayouts ?? [];
        const data = state.media.filter(
          (r) => r.biography_id === owner && layouts.includes(r.layout)
        );
        return Promise.resolve(resolve({ data, error: null }));
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

import { GET } from '@/app/api/biography/[id]/cover-photo/route';

const ED_ID = 'ed-1';
const ORIG_ID = 'orig-1';

function req(id: string) {
  return new NextRequest(`http://localhost/api/biography/${id}/cover-photo`);
}

const call = (id: string) => GET(req(id), { params: { id } });

beforeEach(() => {
  vi.clearAllMocks();
  state.media = [];
  state.lastInLayouts = null;
  state.lastEqBiographyId = null;
  resolveBiographyId.mockImplementation(async (_c: unknown, id: string) => id);
  verifyBiographyViewAccess.mockResolvedValue({ ok: true });
  resolveMediaOwnerId.mockImplementation(async (_c: unknown, id: string) => id);
  createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/cover.jpg' },
    error: null,
  });
});

describe('GET /api/biography/[id]/cover-photo', () => {
  it('edizione leggibile: url dalla cover dell\'originale (layout cover preferito a cover_a5)', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    state.media = [
      {
        biography_id: ORIG_ID,
        layout: 'cover_a5',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/a5.jpg',
      },
      {
        biography_id: ORIG_ID,
        layout: 'cover',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/cover.jpg',
      },
      {
        biography_id: ORIG_ID,
        layout: 'full-page',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/gal.jpg',
      },
    ];

    const res = await call(ED_ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://signed.example/cover.jpg' });
    expect(resolveMediaOwnerId).toHaveBeenCalledWith(expect.anything(), ED_ID);
    expect(state.lastEqBiographyId).toBe(ORIG_ID);
    expect(state.lastInLayouts).toEqual(['cover', 'cover_a5']);
    expect(createSignedUrl).toHaveBeenCalledWith('u/cover.jpg', 3600);
  });

  it('accesso negato: stesso status/body di gallery-photos', async () => {
    verifyBiographyViewAccess.mockResolvedValue({ ok: false, status: 403 });
    const res = await call(ED_ID);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Access denied' });
    expect(resolveMediaOwnerId).not.toHaveBeenCalled();
  });

  it('senza copertina: { url: null } con 200', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    state.media = [
      {
        biography_id: ORIG_ID,
        layout: 'full-page',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/gal.jpg',
      },
    ];
    const res = await call(ED_ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: null });
  });

  it('interroga solo layout cover / cover_a5 (mai gallery)', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    state.media = [
      {
        biography_id: ORIG_ID,
        layout: 'cover_a5',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/a5.jpg',
      },
      {
        biography_id: ORIG_ID,
        layout: 'two-vertical',
        file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/tv.jpg',
      },
    ];
    const res = await call(ORIG_ID);
    expect(res.status).toBe(200);
    expect(state.lastInLayouts).toEqual(['cover', 'cover_a5']);
    expect(state.lastInLayouts).not.toContain('full-page');
    expect(state.lastInLayouts).not.toContain('two-vertical');
    const body = await res.json();
    expect(body.url).toBe('https://signed.example/cover.jpg');
    expect(JSON.stringify(body)).not.toMatch(/two-vertical|full-page|gal\.jpg|tv\.jpg/);
  });

  it('originale senza cover: url vuoto', async () => {
    resolveMediaOwnerId.mockResolvedValue(ORIG_ID);
    state.media = [];
    const res = await call(ORIG_ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: null });
  });
});
