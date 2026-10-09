import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const sweepStaleAnalysisJobs = vi.fn();
const buildServiceClient = vi.fn(() => ({ tag: 'svc' }));

vi.mock('@/lib/server/analysis-jobs', () => ({
  sweepStaleAnalysisJobs: (...a: unknown[]) =>
    (sweepStaleAnalysisJobs as (...x: unknown[]) => Promise<unknown>)(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

describe('POST /api/cron/analysis-jobs', () => {
  const prevSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    sweepStaleAnalysisJobs.mockResolvedValue(2);
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  });

  it('401 senza il segreto', async () => {
    const { POST } = await import('@/app/api/cron/analysis-jobs/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/analysis-jobs', { method: 'POST' })
    );
    expect(res.status).toBe(401);
    expect(sweepStaleAnalysisJobs).not.toHaveBeenCalled();
  });

  it('401 con segreto sbagliato', async () => {
    const { POST } = await import('@/app/api/cron/analysis-jobs/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/analysis-jobs', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong' },
      })
    );
    expect(res.status).toBe(401);
  });

  it('200 con il segreto: interrompe i lavori scaduti', async () => {
    const { POST } = await import('@/app/api/cron/analysis-jobs/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/analysis-jobs', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ interrupted: 2 });
    expect(sweepStaleAnalysisJobs).toHaveBeenCalledWith({ tag: 'svc' });
  });
});
