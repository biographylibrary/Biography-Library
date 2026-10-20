import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/maintenance/flag', () => ({
  fetchMaintenanceEnabled: vi.fn(),
}));

describe('cronSkipIfMaintenance', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null when maintenance is off', async () => {
    const { fetchMaintenanceEnabled } = await import('@/lib/maintenance/flag');
    vi.mocked(fetchMaintenanceEnabled).mockResolvedValue(false);
    const { cronSkipIfMaintenance } = await import('@/lib/maintenance/cron');
    await expect(cronSkipIfMaintenance()).resolves.toBeNull();
  });

  it('returns 200 skipped when maintenance is on', async () => {
    const { fetchMaintenanceEnabled } = await import('@/lib/maintenance/flag');
    vi.mocked(fetchMaintenanceEnabled).mockResolvedValue(true);
    const { cronSkipIfMaintenance } = await import('@/lib/maintenance/cron');
    const res = await cronSkipIfMaintenance();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(await res!.json()).toEqual({ skipped: 'maintenance' });
  });
});
