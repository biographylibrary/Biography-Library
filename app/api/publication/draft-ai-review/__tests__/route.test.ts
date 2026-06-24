import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const checkPerUserThrottle = vi.fn();
const fetchBiographyContent = vi.fn();
const runDraftAiReview = vi.fn();
const buildServiceClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
  checkPerUserThrottle: () => checkPerUserThrottle(),
  fetchBiographyContent: () => fetchBiographyContent(),
  runDraftAiReview: (text: string, iteration: number, lang: string) =>
    runDraftAiReview(text, iteration, lang),
}));

describe('draft-ai-review route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    checkPerUserThrottle.mockResolvedValue(true);
    fetchBiographyContent.mockResolvedValue({ text: 'Bio text', contentLanguage: 'it' });
    runDraftAiReview.mockResolvedValue({
      overall_quality: 4,
      strengths: [],
      suggestions: [],
      red_flags: [],
      ready_for_publication: false,
    });
    buildServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table !== 'biographies') throw new Error(`unexpected ${table}`);
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    user_id: 'user-1',
                    status: 'pdf_draft',
                    pdf_draft_iteration: 0,
                    content_language: 'it',
                  },
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      },
    });
  });

  it('returns 403 for foreign biography', async () => {
    buildServiceClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { user_id: 'other-user', status: 'pdf_draft', pdf_draft_iteration: 0 },
              }),
          }),
        }),
      }),
    });

    const { POST } = await import('@/app/api/publication/draft-ai-review/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/draft-ai-review', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(403);
  });

  it('runs Gemma-backed draft review and stores feedback', async () => {
    const { POST } = await import('@/app/api/publication/draft-ai-review/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/draft-ai-review', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.iteration).toBe(1);
    expect(runDraftAiReview).toHaveBeenCalledWith('Bio text', 1, 'it');
    expect(body.feedback.overall_quality).toBe(4);
  });

  it('returns 400 when biography is not in pdf_draft', async () => {
    buildServiceClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { user_id: 'user-1', status: 'final_version', pdf_draft_iteration: null },
              }),
          }),
        }),
      }),
    });

    const { POST } = await import('@/app/api/publication/draft-ai-review/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/draft-ai-review', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_status');
  });
});
