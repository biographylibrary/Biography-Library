import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const syncDueArchivePackages = vi.fn();
const buildServiceClient = vi.fn(() => ({ tag: 'svc' }));

vi.mock('@/lib/server/archive-package-store', () => ({
  syncDueArchivePackages: (...a: unknown[]) =>
    (syncDueArchivePackages as (...x: unknown[]) => Promise<unknown>)(...a),
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

describe('POST /api/cron/archive-packages', () => {
  const prevSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  });

  it('401 senza il segreto', async () => {
    const { POST } = await import('@/app/api/cron/archive-packages/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/archive-packages', { method: 'POST' })
    );
    expect(res.status).toBe(401);
    expect(syncDueArchivePackages).not.toHaveBeenCalled();
  });

  it('200 quando failed è vuoto', async () => {
    const body = { checked: 2, deposited: 1, failed: [] as string[] };
    syncDueArchivePackages.mockResolvedValue(body);
    const { POST } = await import('@/app/api/cron/archive-packages/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/archive-packages', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(body);
  });

  it('500 con il corpo completo quando failed non è vuoto', async () => {
    const body = { checked: 3, deposited: 1, failed: ['orig-a', 'orig-b'] };
    syncDueArchivePackages.mockResolvedValue(body);
    const { POST } = await import('@/app/api/cron/archive-packages/route');
    const res = await POST(
      new NextRequest('http://localhost/api/cron/archive-packages', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(body);
  });
});
