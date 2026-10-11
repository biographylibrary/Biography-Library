import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const getUser = vi.fn();
const runReviewSubmitScreening = vi.fn();
const startAnalysisJob = vi.fn();
const routeScreeningFailureToManualReview = vi.fn(async () => undefined);

let db: FakeDb;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock('@/lib/server/analysis-jobs', () => ({
  startAnalysisJob: (...a: unknown[]) =>
    (startAnalysisJob as (...x: unknown[]) => unknown)(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  STAFF_ROLES: new Set(['reviewer', 'admin', 'super_admin']),
  buildServiceClient: () => db.client,
  checkPerUserThrottle: async () => true,
  generateAndStoreExports: async () => undefined,
  runReviewSubmitScreening: (...a: unknown[]) => runReviewSubmitScreening(...a),
  routeScreeningFailureToManualReview: (...a: unknown[]) =>
    (routeScreeningFailureToManualReview as (...x: unknown[]) => Promise<unknown>)(...a),
}));

import { POST } from '@/app/api/review/submit/route';

const ORIG_TEXT = '<p>Testo originale della biografia abbastanza lungo.</p>';
const ED_TEXT = '<p>Translated edition text that differs from the original.</p>';

function seedOriginal(opts?: {
  status?: string;
  ai_screening_status?: string | null;
  user_id?: string;
  withCover?: boolean;
}) {
  const status = opts?.status ?? 'draft';
  const withCover = opts?.withCover !== false;
  db = createFakeDb({
    profiles: [{ id: 'owner-1', role: 'user' }],
    biographies: [
      {
        id: 'bio-1',
        user_id: opts?.user_id ?? 'owner-1',
        status,
        ai_screening_status: opts?.ai_screening_status ?? null,
        translation_of: null,
        content_freeflow: ORIG_TEXT,
        final_version: null,
      },
    ],
    biography_media: withCover
      ? [{ id: 'cover', biography_id: 'bio-1', layout: 'cover' }]
      : [],
  });
}

function seedEdition(opts: { originalHasCover: boolean }) {
  db = createFakeDb({
    profiles: [{ id: 'owner-1', role: 'user' }],
    biographies: [
      {
        id: 'orig-1',
        user_id: 'owner-1',
        status: 'published',
        translation_of: null,
        content_freeflow: ORIG_TEXT,
        final_version: ORIG_TEXT,
      },
      {
        id: 'ed-1',
        user_id: 'owner-1',
        status: 'draft',
        ai_screening_status: null,
        translation_of: 'orig-1',
        content_freeflow: ED_TEXT,
        final_version: null,
      },
    ],
    biography_media: opts.originalHasCover
      ? [{ id: 'cover', biography_id: 'orig-1', layout: 'cover' }]
      : [],
  });
}

const req = (biographyId = 'bio-1') =>
  new NextRequest('http://localhost/api/review/submit', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt' },
    body: JSON.stringify({ biographyId }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  seedOriginal();
  startAnalysisJob.mockImplementation(async (_c, _id, _k, work: () => Promise<unknown>) => {
    void work;
    return { jobId: 'job-1', started: true };
  });
});

describe('POST /api/review/submit', () => {
  it('scrive lo stato e risponde 202 con jobId senza attendere lo screening', async () => {
    const res = await POST(req());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: 'job-1' });
    const bio = db.tables.biographies.find((b) => b.id === 'bio-1');
    expect(bio?.status).toBe('under_review');
    expect(bio?.ai_screening_status).toBe('pending');
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
    expect(startAnalysisJob.mock.calls[0][2]).toBe('screening');
  });

  it.each(['under_review', 'removed', 'published', 'suspended_pending_verification', 'locked_pending_screening'])(
    'da %s l\'autore non può rimettere la scheda in coda: 409 e nessuno screening',
    async (status) => {
      seedOriginal({ status });
      const res = await POST(req());
      expect(res.status).toBe(409);
      expect(db.log.filter((l) => l.op === 'update')).toHaveLength(0);
      expect(startAnalysisJob).not.toHaveBeenCalled();
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
      seedOriginal({ status, ai_screening_status: screening });
      const res = await POST(req());
      expect(res.status).toBe(202);
      expect(startAnalysisJob).toHaveBeenCalledTimes(1);
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
  ])('%s con %s: niente nuovo tentativo dell\'autore', async (status, screening) => {
    seedOriginal({ status, ai_screening_status: screening });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(startAnalysisJob).not.toHaveBeenCalled();
  });

  it('lo staff può rilanciare lo screening da qualunque stato', async () => {
    seedOriginal({ status: 'under_review', ai_screening_status: 'flagged' });
    db.tables.profiles[0].role = 'reviewer';
    const res = await POST(req());
    expect(res.status).toBe(202);
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
  });

  it('rifiuta chi non è il proprietario', async () => {
    seedOriginal({ user_id: 'someone-else' });
    expect((await POST(req())).status).toBe(403);
  });

  it('originale senza copertina risponde 400 e non cambia lo stato', async () => {
    seedOriginal({ withCover: false });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_cover' });
    expect(db.log.filter((l) => l.op === 'update')).toHaveLength(0);
  });

  it('originale con copertina risponde 202', async () => {
    seedOriginal({ withCover: true });
    const res = await POST(req());
    expect(res.status).toBe(202);
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
  });

  it('edizione il cui originale ha cover → 202, aggiorna stato e avvia screening', async () => {
    seedEdition({ originalHasCover: true });
    const res = await POST(req('ed-1'));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: 'job-1' });
    const ed = db.tables.biographies.find((b) => b.id === 'ed-1');
    expect(ed?.status).toBe('under_review');
    expect(ed?.ai_screening_status).toBe('pending');
    expect(startAnalysisJob).toHaveBeenCalledWith(expect.anything(), 'ed-1', 'screening', expect.any(Function));
  });

  it('edizione il cui originale non ha cover → 400 missing_cover, nessuno update', async () => {
    seedEdition({ originalHasCover: false });
    const res = await POST(req('ed-1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_cover' });
    expect(db.log.filter((l) => l.op === 'update')).toHaveLength(0);
    expect(startAnalysisJob).not.toHaveBeenCalled();
  });

  it('se startAnalysisJob fallisce: instrada in coda umana e 500', async () => {
    startAnalysisJob.mockRejectedValueOnce(new Error('analysis_job_insert_failed'));
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(routeScreeningFailureToManualReview).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'start_failed'
    );
    expect(db.tables.biographies.find((b) => b.id === 'bio-1')?.status).toBe('under_review');
  });

  it('se startAnalysisJob fallisce e l\'instradamento non lancia: comunque 500', async () => {
    startAnalysisJob.mockRejectedValueOnce(new Error('analysis_job_insert_failed'));
    routeScreeningFailureToManualReview.mockResolvedValueOnce(undefined);
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal error' });
  });
});
