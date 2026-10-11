import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

const checkPerUserThrottle = vi.fn();
const generateUploadFinalPdf = vi.fn();
const generateAndStoreExports = vi.fn();
const runReviewSubmitScreening = vi.fn();
const startAnalysisJob = vi.fn();
const routeScreeningFailureToManualReview = vi.fn(async () => undefined);
const getUser = vi.fn();
const biographyHasCoverPhotoSpy = vi.fn();

let db: FakeDb;

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
  buildServiceClient: () => db.client,
  checkPerUserThrottle: () => checkPerUserThrottle(),
  generateAndStoreExports: () => generateAndStoreExports(),
  runReviewSubmitScreening: () => runReviewSubmitScreening(),
  routeScreeningFailureToManualReview: (...a: unknown[]) =>
    (routeScreeningFailureToManualReview as (...x: unknown[]) => Promise<unknown>)(...a),
}));

vi.mock('@/lib/server/final-pdf-artifacts', () => ({
  generateUploadFinalPdf: () => generateUploadFinalPdf(),
}));

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

const FINAL = 'x'.repeat(60);
const ORIG_TEXT = '<p>Original published body for the source biography.</p>';
const ED_TEXT = '<p>Translated body that is clearly different from original.</p>';

function seedOriginalPdfDraft(opts?: { user_id?: string; status?: string; withCover?: boolean }) {
  const withCover = opts?.withCover !== false;
  db = createFakeDb({
    biographies: [
      {
        id: 'bio-1',
        user_id: opts?.user_id ?? 'user-1',
        status: opts?.status ?? 'pdf_draft',
        pdf_draft_iteration: 1,
        final_version: FINAL,
        record_language_tag: 'it',
        record_script: 'Latn',
        translation_of: null,
        content_freeflow: FINAL,
      },
    ],
    biography_media: withCover
      ? [{ id: 'cover-1', biography_id: 'bio-1', layout: 'cover' }]
      : [],
    moderation_reports: [],
  });
}

function seedEditionPdfDraft(originalHasCover: boolean) {
  db = createFakeDb({
    biographies: [
      {
        id: 'orig-1',
        user_id: 'user-1',
        status: 'published',
        record_script: 'Latn',
        translation_of: null,
        content_freeflow: ORIG_TEXT,
        final_version: ORIG_TEXT,
      },
      {
        id: 'ed-1',
        user_id: 'user-1',
        status: 'pdf_draft',
        pdf_draft_iteration: 1,
        final_version: ED_TEXT + ' ' + FINAL,
        record_language_tag: 'en',
        record_script: 'Latn',
        translation_of: 'orig-1',
        content_freeflow: ED_TEXT,
      },
    ],
    biography_media: originalHasCover
      ? [{ id: 'cover-1', biography_id: 'orig-1', layout: 'cover' }]
      : [],
    moderation_reports: [],
  });
}

const post = async (biographyId: string) => {
  const { POST } = await import('@/app/api/publication/approve-final-pdf/route');
  return POST(
    new NextRequest('http://localhost/api/publication/approve-final-pdf', {
      method: 'POST',
      headers: { authorization: 'Bearer jwt' },
      body: JSON.stringify({ biographyId }),
    })
  );
};

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
    runReviewSubmitScreening.mockResolvedValue({
      result: 'published',
      screeningStatus: 'passed',
      isRescreen: false,
    });
    startAnalysisJob.mockResolvedValue({ jobId: 'job-approve', started: true });
    seedOriginalPdfDraft();
  });

  it('dopo PDF e lock risponde 202 con jobId e URL', async () => {
    const res = await post('bio-1');
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toMatchObject({
      jobId: 'job-approve',
      finalPdfUrl: 'https://cdn/final.pdf',
      listingCoverUrl: 'https://cdn/cover.png',
    });
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'bio-1');
  });

  it('se startAnalysisJob fallisce: instrada in coda umana e 500', async () => {
    startAnalysisJob.mockRejectedValueOnce(new Error('analysis_job_insert_failed'));
    const res = await post('bio-1');
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
    seedOriginalPdfDraft({ user_id: 'other-user' });
    const res = await post('bio-1');
    expect(res.status).toBe(403);
  });

  it('risponde 409 se l\'edizione ha l\'originale non pubblicato, senza scrivere', async () => {
    db = createFakeDb({
      biographies: [
        {
          id: 'orig-1',
          user_id: 'user-1',
          status: 'draft',
          translation_of: null,
          content_freeflow: ORIG_TEXT,
        },
        {
          id: 'bio-1',
          user_id: 'user-1',
          status: 'pdf_draft',
          pdf_draft_iteration: 1,
          final_version: FINAL,
          record_script: 'Latn',
          translation_of: 'orig-1',
          content_freeflow: ED_TEXT,
        },
      ],
      biography_media: [{ id: 'cover-1', biography_id: 'orig-1', layout: 'cover' }],
    });
    const res = await post('bio-1');
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'original_not_published' });
    expect(generateUploadFinalPdf).not.toHaveBeenCalled();
    expect(db.log.filter((l) => l.op === 'update')).toHaveLength(0);
  });

  it('returns 400 when biography is not in pdf_draft status', async () => {
    seedOriginalPdfDraft({ status: 'final_version' });
    const res = await post('bio-1');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_status');
  });

  it('originale senza cover → 400 missing_cover', async () => {
    seedOriginalPdfDraft({ withCover: false });
    const res = await post('bio-1');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_cover' });
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'bio-1');
    expect(generateUploadFinalPdf).not.toHaveBeenCalled();
  });

  it('edizione con cover sull\'originale → 202 e screening job', async () => {
    seedEditionPdfDraft(true);
    const res = await post('ed-1');
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ jobId: 'job-approve' });
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'ed-1');
    expect(startAnalysisJob).toHaveBeenCalledTimes(1);
  });

  it('edizione senza cover sull\'originale → 400 missing_cover', async () => {
    seedEditionPdfDraft(false);
    const res = await post('ed-1');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_cover' });
    expect(biographyHasCoverPhotoSpy).toHaveBeenCalledWith(db.client, 'ed-1');
    expect(generateUploadFinalPdf).not.toHaveBeenCalled();
  });
});
