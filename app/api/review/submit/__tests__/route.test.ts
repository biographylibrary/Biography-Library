import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const runReviewSubmitScreening = vi.fn();
const updates: Array<Record<string, unknown>> = [];
const tables: Record<string, Record<string, unknown> | null> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  STAFF_ROLES: new Set(['reviewer', 'admin', 'super_admin']),
  buildServiceClient: () => ({
    from: (table: string) => ({
      select: () => {
        const chain: Record<string, unknown> = {};
        chain.eq = () => chain;
        chain.in = () => chain;
        chain.limit = () => chain;
        chain.maybeSingle = async () => ({ data: tables[table] ?? null, error: null });
        return chain;
      },
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          updates.push({ table, ...patch });
          return { error: null };
        },
      }),
    }),
  }),
  checkPerUserThrottle: async () => true,
  generateAndStoreExports: async () => undefined,
  runReviewSubmitScreening: (...a: unknown[]) => runReviewSubmitScreening(...a),
}));

import { POST } from '@/app/api/review/submit/route';

const req = () =>
  new NextRequest('http://localhost/api/review/submit', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt' },
    body: JSON.stringify({ biographyId: 'bio-1' }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  tables.profiles = { role: 'user' };
  tables.biographies = { user_id: 'owner-1', status: 'draft' };
  tables.biography_media = { id: 'cover' };
  runReviewSubmitScreening.mockResolvedValue({ result: 'under_review', message: 'flagged', isRescreen: false });
});

describe('POST /api/review/submit', () => {
  it('lo stato di revisione lo scrive il server, prima dello screening', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updates).toEqual([{ table: 'biographies', status: 'under_review', ai_screening_status: 'pending' }]);
    expect(runReviewSubmitScreening).toHaveBeenCalledTimes(1);
  });

  it.each(['under_review', 'removed', 'published', 'suspended_pending_verification', 'locked_pending_screening'])(
    'da %s l\'autore non può rimettere la scheda in coda: 409 e nessuno screening',
    async (status) => {
      tables.biographies = { user_id: 'owner-1', status };
      const res = await POST(req());
      expect(res.status).toBe(409);
      expect(updates).toHaveLength(0);
      expect(runReviewSubmitScreening).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['under_review', 'ai_error'],
    ['under_review', 'parse_error'],
    ['locked_pending_screening', 'ai_error'],
    ['locked_pending_screening', 'parse_error'],
  ])(
    '"Riprova analisi": da %s con %s l\'autore può ripetere lo screening sullo stesso testo',
    async (status, screening) => {
      tables.biographies = { user_id: 'owner-1', status, ai_screening_status: screening };
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect(runReviewSubmitScreening).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ['under_review', 'flagged'],
    ['under_review', 'pending'],
    ['under_review', 'passed'],
    ['locked_pending_screening', 'pending'],
    ['published', 'ai_error'],
    ['removed', 'parse_error'],
    ['revision_pending_review', 'ai_error'],
  ])('%s con %s: niente nuovo tentativo dell\'autore (passaggi segnalati, screening in corso, altri stati)', async (status, screening) => {
    tables.biographies = { user_id: 'owner-1', status, ai_screening_status: screening };
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(runReviewSubmitScreening).not.toHaveBeenCalled();
  });

  it('lo staff può rilanciare lo screening da qualunque stato', async () => {
    tables.profiles = { role: 'reviewer' };
    tables.biographies = { user_id: 'owner-1', status: 'under_review', ai_screening_status: 'flagged' };
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(runReviewSubmitScreening).toHaveBeenCalledTimes(1);
  });

  it('rifiuta chi non è il proprietario', async () => {
    tables.biographies = { user_id: 'someone-else', status: 'draft' };
    expect((await POST(req())).status).toBe(403);
  });

  it('senza copertina risponde 400 e non cambia lo stato', async () => {
    tables.biography_media = null;
    expect((await POST(req())).status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});
