import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMaintenanceFlagCache,
  fetchMaintenanceEnabled,
  seedMaintenanceFlagCache,
} from '@/lib/maintenance/flag';

describe('fetchMaintenanceEnabled', () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    clearMaintenanceFlagCache();
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
  });

  it('returns cached value without fetching', async () => {
    seedMaintenanceFlagCache(true);
    const fetchImpl = vi.fn();
    await expect(fetchMaintenanceEnabled({ fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads enabled=true from REST', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ value: { enabled: true } }],
    });
    await expect(fetchMaintenanceEnabled({ fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fail-open on network error', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    await expect(fetchMaintenanceEnabled({ fetchImpl })).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('fail-open on non-OK response', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchMaintenanceEnabled({ fetchImpl })).resolves.toBe(false);
    spy.mockRestore();
  });
});
