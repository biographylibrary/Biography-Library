import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const checkPerUserThrottle = vi.fn();
const buildServiceClient = vi.fn();
const generateUploadFinalPdf = vi.fn();
const generateAndStoreExports = vi.fn();
const runReviewSubmitScreening = vi.fn();
const startAnalysisJob = vi.fn();
const routeScreeningFailureToManualReview = vi.fn(async () => undefined);
const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

vi.mock('@/lib/server/analysis-jobs', () => ({
  startAnalysisJob: (...a: unknown[]) =>
    (startAnalysisJob as (...x: unknown[]) => unknown)(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
  checkPerUserThrottle: () => checkPerUserThrottle(),
  generateAndStoreExports: () => generateAndStoreExports(),
  runReviewSubmitScreening: () => runReviewSubmitScreening(),
  routeScreeningFailureToManualReview: (...a: unknown[]) =>
    (routeScreeningFailureToManualReview as (...x: unknown[]) => Promise<unknown>)(...a),
}));

vi.mock('@/lib/server/final-pdf-artifacts', () => ({
  generateUploadFinalPdf: () => generateUploadFinalPdf(),
}));

function makeServiceClient(bio: Record<string, unknown> | null, cover = { id: 'cover-1' }) {
  const bioMaybeSingle = vi.fn().mockResolvedValue({ data: bio });
  const coverMaybeSingle = vi.fn().mockResolvedValue({ data: cover });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const insertSelect = vi.fn().mockResolvedValue({ data: { id: 'report-1' } });
  const insert = vi.fn(() => ({ select: () => ({ maybeSingle: insertSelect }) }));

  const from = vi.fn((table: string) => {
    if (table === 'biographies') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: bioMaybeSingle }) }),
        update,
      };
    }
    if (table === 'biography_media') {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              limit: () => ({ maybeSingle: coverMaybeSingle }),
            }),
          }),
        }),
      };
    }
    if (table === 'moderation_reports') {
      return { insert };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, update, updateEq };
}

describe('approve-final-pdf route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    checkPerUserThrottle.mockResolvedValue(true);
    generateUploadFinalPdf.mockResolvedValue({
      finalPdfUrl: 'https://cdn/final.pdf',
      listingCoverUrl: 'https://cdn/cover.png',
    });
    generateAndStoreExports.mockResolvedValue(undefined);
    runReviewSubmitScreening.mockResolvedValue({ result: 'published', screeningStatus: 'passed', isRescreen: false });
    startAnalysisJob.mockResolvedValue({ jobId: 'job-approve', started: true });
  });

  it('dopo PDF e lock risponde 202 con jobId e URL', async () => {
    const client = makeServiceClient({
      user_id: 'user-1',
      status: 'pdf_draft',
      pdf_draft_iteration: 1,
      final_version: 'x'.repeat(60),
      record_language_tag: 'it',
    });
    buildServiceClient.mockReturnValue(client);

    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const req = new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ biographyId: 'bio-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toMatchObject({
      jobId: 'job-approve',
      finalPdfUrl: 'https://cdn/final.pdf',
      listingCoverUrl: 'https://cdn/cover.png',
    });
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
  });

  it('se startAnalysisJob fallisce: instrada in coda umana e 500', async () => {
    const client = makeServiceClient({
      user_id: 'user-1',
      status: 'pdf_draft',
      pdf_draft_iteration: 1,
      final_version: 'x'.repeat(60),
      record_language_tag: 'it',
    });
    buildServiceClient.mockReturnValue(client);
    startAnalysisJob.mockRejectedValueOnce(new Error('analysis_job_insert_failed'));

    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const req = new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ biographyId: 'bio-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(routeScreeningFailureToManualReview).toHaveBeenCalledWith(
      expect.anything(),
      'bio-1',
      'start_failed'
    );
  });

  it('returns 401 without bearer token', async () => {
    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const req = new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      body: JSON.stringify({ biographyId: 'bio-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for biography owned by another user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const client = makeServiceClient({
      user_id: 'other-user',
      status: 'pdf_draft',
      pdf_draft_iteration: 1,
      final_version: 'x'.repeat(60),
      record_language_tag: 'it',
    });
    buildServiceClient.mockReturnValue(client);

    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const req = new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ biographyId: 'bio-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('risponde 409 se l\'edizione ha l\'originale non pubblicato, senza scrivere', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const client = makeServiceClient({
      user_id: 'user-1',
      status: 'pdf_draft',
      pdf_draft_iteration: 1,
      final_version: 'x'.repeat(60),
      record_script: 'Latn',
      translation_of: 'orig-1',
    });
    buildServiceClient.mockReturnValue(client);
    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/approve-final-pdf', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'original_not_published' });
    expect(client.update).not.toHaveBeenCalled();
    expect(generateUploadFinalPdf).not.toHaveBeenCalled();
  });

  it('returns 400 when biography is not in pdf_draft status', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const client = makeServiceClient({
      user_id: 'user-1',
      status: 'final_version',
      pdf_draft_iteration: 1,
      final_version: 'x'.repeat(60),
      record_language_tag: 'it',
    });
    buildServiceClient.mockReturnValue(client);

    const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
    const req = new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ biographyId: 'bio-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_status');
  });
});
