import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser },
    from: (table: string) => {
      if (table === 'biographies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { user_id: 'user-1', status: 'final_version' },
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'biography_media') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'cover-1' } }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

describe('start-pdf-draft route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('transitions owned biography from final_version to pdf_draft', async () => {
    const { POST } = await import('@/app/api/publication/start-pdf-draft/route');
    const res = await POST(
      new NextRequest('http://localhost/api/publication/start-pdf-draft', {
        method: 'POST',
        headers: { authorization: 'Bearer jwt' },
        body: JSON.stringify({ biographyId: 'bio-1' }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pdf_draft');
    expect(body.ok).toBe(true);
  });
});
