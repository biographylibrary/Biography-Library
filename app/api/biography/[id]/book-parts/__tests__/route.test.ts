import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const resolveBiographyId = vi.fn();
const verifyBiographyViewAccess = vi.fn();
const getUser = vi.fn();

type StructureRow = Record<string, unknown>;

const structures = new Map<string, StructureRow>();

vi.mock('@/lib/server/biography-view-access', () => ({
  resolveBiographyId: (...a: unknown[]) => resolveBiographyId(...a),
  verifyBiographyViewAccess: (...a: unknown[]) => verifyBiographyViewAccess(...a),
}));

vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => ({
    from: (table: string) => {
      if (table !== 'biography_book_structure') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: (_col: string, id: string) => ({
            maybeSingle: async () => ({
              data: structures.get(id) ?? null,
              error: null,
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: getUser() } }),
    },
  }),
}));

import { GET } from '@/app/api/biography/[id]/book-parts/route';

const ORIG_ID = '10000000-0000-4000-8000-000000000001';
const ED_ID = '10000000-0000-4000-8000-000000000002';
const DRAFT_ID = '10000000-0000-4000-8000-000000000003';

function req(id: string, opts?: { shareToken?: string; auth?: boolean }) {
  const url = new URL(`http://localhost/api/biography/${id}/book-parts`);
  if (opts?.shareToken) url.searchParams.set('shareToken', opts.shareToken);
  const headers: Record<string, string> = {};
  if (opts?.auth) headers.authorization = 'Bearer jwt';
  return new NextRequest(url, { headers });
}

const call = (id: string, opts?: { shareToken?: string; auth?: boolean }) =>
  GET(req(id, opts), { params: { id } });

beforeEach(() => {
  vi.clearAllMocks();
  structures.clear();
  resolveBiographyId.mockImplementation(async (_c: unknown, id: string) => id);
  getUser.mockReturnValue(null);
  structures.set(ORIG_ID, {
    dedication_content: 'Per Anna',
    dedication_enabled: true,
    epigraph_content: 'Citazione',
    epigraph_source: 'Fonte',
    epigraph_enabled: true,
    preface_content: 'Prefazione',
    preface_enabled: true,
    epilogue_content: 'Epilogo',
    epilogue_enabled: true,
    acknowledgements_content: 'Grazie',
    acknowledgements_enabled: true,
    specific_credits_content: 'Crediti',
    specific_credits_enabled: true,
  });
  structures.set(ED_ID, {
    dedication_content: 'Solo edizione',
    dedication_enabled: true,
    epigraph_content: '',
    epigraph_source: null,
    epigraph_enabled: false,
    preface_content: '',
    preface_enabled: false,
    epilogue_content: 'Fine edizione',
    epilogue_enabled: true,
    acknowledgements_content: '',
    acknowledgements_enabled: false,
    specific_credits_content: '',
    specific_credits_enabled: false,
  });
  structures.set(DRAFT_ID, {
    dedication_content: 'Bozza',
    dedication_enabled: true,
    epigraph_enabled: false,
    preface_enabled: false,
    epilogue_enabled: false,
    acknowledgements_enabled: false,
    specific_credits_enabled: false,
  });
});

describe('GET /api/biography/[id]/book-parts', () => {
  it('scheda pubblica con parti: front e back giusti', async () => {
    verifyBiographyViewAccess.mockResolvedValue({
      ok: true,
      accessType: 'public',
      biography: { id: ORIG_ID },
    });
    const res = await call(ORIG_ID);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body.front.map((p: { key: string }) => p.key)).toEqual([
      'dedication',
      'epigraph',
      'preface',
    ]);
    expect(body.back.map((p: { key: string }) => p.key)).toEqual([
      'epilogue',
      'acknowledgements',
      'specific_credits',
    ]);
    expect(body.front[1].source).toBe('Fonte');
    expect(JSON.stringify(body)).not.toContain('user_id');
    expect(JSON.stringify(body)).not.toContain('enabled');
  });

  it('parti spente: risposta vuota', async () => {
    structures.set(ORIG_ID, {
      dedication_content: 'x',
      dedication_enabled: false,
      epigraph_enabled: false,
      preface_enabled: false,
      epilogue_enabled: false,
      acknowledgements_enabled: false,
      specific_credits_enabled: false,
    });
    verifyBiographyViewAccess.mockResolvedValue({
      ok: true,
      accessType: 'public',
      biography: { id: ORIG_ID },
    });
    const res = await call(ORIG_ID);
    expect(await res.json()).toEqual({ front: [], back: [] });
  });

  it('token sbagliato: 403', async () => {
    verifyBiographyViewAccess.mockResolvedValue({ ok: false, status: 403 });
    const res = await call(ORIG_ID, { shareToken: 'bad' });
    expect(res.status).toBe(403);
  });

  it('bozza privata senza sessione: 403', async () => {
    verifyBiographyViewAccess.mockResolvedValue({ ok: false, status: 403 });
    const res = await call(DRAFT_ID);
    expect(res.status).toBe(403);
  });

  it('proprietario: parti anche in bozza', async () => {
    getUser.mockReturnValue({ id: 'author-1' });
    verifyBiographyViewAccess.mockResolvedValue({
      ok: true,
      accessType: 'owner-staff',
      biography: { id: DRAFT_ID },
    });
    const res = await call(DRAFT_ID, { auth: true });
    expect(res.status).toBe(200);
    expect((await res.json()).front).toEqual([
      { key: 'dedication', text: 'Bozza' },
    ]);
  });

  it('link riservato con token giusto', async () => {
    verifyBiographyViewAccess.mockResolvedValue({
      ok: true,
      accessType: 'share-token',
      biography: { id: ORIG_ID },
    });
    const res = await call(ORIG_ID, { shareToken: 'tok' });
    expect(res.status).toBe(200);
    expect((await res.json()).front.length).toBeGreaterThan(0);
  });

  it('edizione restituisce solo le proprie righe', async () => {
    verifyBiographyViewAccess.mockResolvedValue({
      ok: true,
      accessType: 'public',
      biography: { id: ED_ID },
    });
    const res = await call(ED_ID);
    const body = await res.json();
    expect(body.front).toEqual([{ key: 'dedication', text: 'Solo edizione' }]);
    expect(body.back).toEqual([{ key: 'epilogue', text: 'Fine edizione' }]);
    expect(JSON.stringify(body)).not.toContain('Per Anna');
  });
});
