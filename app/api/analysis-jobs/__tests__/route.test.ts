import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const getLatestJob = vi.fn();
const tables: Record<string, Record<string, unknown> | null> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock('@/lib/server/analysis-jobs', () => ({
  getLatestJob: (...a: unknown[]) => getLatestJob(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  STAFF_ROLES: new Set(['reviewer', 'admin', 'super_admin']),
  buildServiceClient: () => ({
    from: (table: string) => ({
      select: () => {
        const chain: Record<string, unknown> = {};
        chain.eq = () => chain;
        chain.maybeSingle = async () => ({ data: tables[table] ?? null, error: null });
        return chain;
      },
    }),
  }),
}));

import { GET } from '@/app/api/analysis-jobs/route';

function req(qs: string) {
  return new NextRequest(`http://localhost/api/analysis-jobs?${qs}`, {
    headers: { authorization: 'Bearer jwt' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  tables.profiles = { role: 'user' };
  tables.biographies = { user_id: 'owner-1' };
  getLatestJob.mockResolvedValue({
    status: 'running',
    jobId: 'j1',
    outcome: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  });
});

describe('GET /api/analysis-jobs', () => {
  it('proprietario: 200', async () => {
    const res = await GET(req('biographyId=bio-1&kind=screening'));
    expect(res.status).toBe(200);
    expect(getLatestJob).toHaveBeenCalled();
  });

  it('altro utente: 403', async () => {
    tables.biographies = { user_id: 'other' };
    expect((await GET(req('biographyId=bio-1&kind=screening'))).status).toBe(403);
  });

  it('staff: 200 anche se non proprietario', async () => {
    tables.profiles = { role: 'admin' };
    tables.biographies = { user_id: 'other' };
    expect((await GET(req('biographyId=bio-1&kind=preprint_check'))).status).toBe(200);
  });
});
