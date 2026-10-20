import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rpc = vi.fn();
const buildServiceClient = vi.fn(() => ({ rpc }));
const cronSkipIfMaintenance = vi.fn<() => Promise<Response | null>>(async () => null);

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

vi.mock('@/lib/maintenance/cron', () => ({
  cronSkipIfMaintenance: () => cronSkipIfMaintenance(),
}));

describe('POST /api/cron/ai-rate-limits-cleanup', () => {
  const prevSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    rpc.mockResolvedValue({ error: null });
    cronSkipIfMaintenance.mockResolvedValue(null);
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  });

  it('401 senza il segreto', async () => {
    const { POST } = await import('@/app/api/cron/ai-rate-limits-cleanup/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/ai-rate-limits-cleanup', { method: 'POST' })
    );
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('200 chiama cleanup_ai_rate_limits_30d e non tocca ai_token_usage', async () => {
    const { POST } = await import('@/app/api/cron/ai-rate-limits-cleanup/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/ai-rate-limits-cleanup', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('cleanup_ai_rate_limits_30d');
    const calledNames = rpc.mock.calls.map((c) => String(c[0]));
    expect(calledNames.every((n) => !n.includes('ai_token_usage'))).toBe(true);
  });

  it('500 se la RPC fallisce', async () => {
    rpc.mockResolvedValue({ error: { message: 'boom' } });
    const { POST } = await import('@/app/api/cron/ai-rate-limits-cleanup/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/ai-rate-limits-cleanup', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('200 skipped in manutenzione senza lavorare', async () => {
    const { NextResponse } = await import('next/server');
    cronSkipIfMaintenance.mockResolvedValue(
      NextResponse.json({ skipped: 'maintenance' })
    );
    const { POST } = await import('@/app/api/cron/ai-rate-limits-cleanup/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/ai-rate-limits-cleanup', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: 'maintenance' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
