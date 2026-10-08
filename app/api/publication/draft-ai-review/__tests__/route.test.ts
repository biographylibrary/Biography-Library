import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const checkPerUserThrottle = vi.fn();
const getUser = vi.fn();
const from = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: () => getUser() },
  }),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => ({ from: (...a: unknown[]) => from(...a) }),
  checkPerUserThrottle: () => checkPerUserThrottle(),
}));

describe('draft-ai-review route (alias di record-pdf-draft)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkPerUserThrottle.mockResolvedValue(true);
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    from.mockImplementation((table: string) => {
      if (table === 'biographies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { user_id: 'user-1', status: 'pdf_draft', pdf_draft_iteration: 0 },
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('incrementa l\'iterazione senza feedback AI', async () => {
    const { POST } = await import('@/app/api/publication/draft-ai-review/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/draft-ai-review', {
        method: 'POST',
        headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.iteration).toBe(1);
    expect(body.feedback).toBeUndefined();
  });

  it('401 senza token', async () => {
    const { POST } = await import('@/app/api/publication/draft-ai-review/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/draft-ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(401);
  });
});
