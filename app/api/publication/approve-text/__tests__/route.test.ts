import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';

let db: FakeDb;
const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
}));
vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => db.client,
  checkPerUserThrottle: async () => true,
  generateAndStoreExports: async () => undefined,
  runReviewSubmitScreening: async () => ({ result: 'published', screeningStatus: 'passed', isRescreen: false }),
  routeScreeningFailureToManualReview: async () => undefined,
}));
vi.mock('@/lib/server/analysis-jobs', () => ({
  startAnalysisJob: async () => ({ jobId: 'job-text' }),
}));

import { POST } from '@/app/api/publication/approve-text/route';

const FINAL = 'Testo finale abbastanza lungo per lo screening senza PDF.';

function seed(originalStatus: string) {
  db = createFakeDb({
    biographies: [
      { id: 'orig', user_id: 'author-1', status: originalStatus, record_language_tag: 'it' },
      {
        id: 'bio-1',
        user_id: 'author-1',
        status: 'final_version',
        record_script: 'Arab',
        record_language_tag: 'ar',
        final_version: FINAL,
        translation_of: 'orig',
      },
    ],
  });
}

const req = () =>
  new NextRequest('http://localhost/api/publication/approve-text', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt' },
    body: JSON.stringify({ biographyId: 'bio-1', confirmed: true }),
  });

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: 'author-1' } }, error: null });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
});

describe('POST /api/publication/approve-text', () => {
  it('non blocca l\'edizione se l\'originale non è pubblicato', async () => {
    seed('draft');
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(db.tables.biographies.find((b) => b.id === 'bio-1')?.status).toBe('final_version');
  });

  it('blocca e avvia lo screening se l\'originale è pubblicato', async () => {
    seed('published');
    const res = await POST(req());
    expect(res.status).toBe(202);
    expect(db.tables.biographies.find((b) => b.id === 'bio-1')?.status).toBe('locked_pending_screening');
  });
});
