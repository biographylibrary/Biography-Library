import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createMaintenanceBypassValue,
  MAINTENANCE_BYPASS_COOKIE,
} from '@/lib/maintenance/bypass';

const fetchMaintenanceEnabled = vi.fn();

vi.mock('@/lib/maintenance/flag', () => ({
  fetchMaintenanceEnabled: (...args: unknown[]) => fetchMaintenanceEnabled(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  }),
}));

describe('middleware maintenance gate', () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    fetchMaintenanceEnabled.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-secret-for-hmac';
    vi.resetModules();
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
    if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
  });

  it('passes through when maintenance is off', async () => {
    fetchMaintenanceEnabled.mockResolvedValue(false);
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/dashboard'));
    expect(res.status).toBe(200);
  });

  it('returns 503 HTML for pages when maintenance is on', async () => {
    fetchMaintenanceEnabled.mockResolvedValue(true);
    const { middleware } = await import('@/middleware');
    const res = await middleware(
      new NextRequest('http://localhost/dashboard', {
        headers: { 'accept-language': 'it' },
      })
    );
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
    const body = await res.text();
    expect(body).toContain('Torniamo presto');
  });

  it('returns 503 JSON for APIs when maintenance is on', async () => {
    fetchMaintenanceEnabled.mockResolvedValue(true);
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/api/review/submit'));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'maintenance' });
  });

  it('allows allowlisted paths during maintenance', async () => {
    fetchMaintenanceEnabled.mockResolvedValue(true);
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/login'));
    expect(res.status).toBe(200);
  });

  it('allows admin bypass cookie during maintenance', async () => {
    fetchMaintenanceEnabled.mockResolvedValue(true);
    const value = await createMaintenanceBypassValue('admin-1');
    const { middleware } = await import('@/middleware');
    const res = await middleware(
      new NextRequest('http://localhost/dashboard', {
        headers: { cookie: `${MAINTENANCE_BYPASS_COOKIE}=${value}` },
      })
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(MAINTENANCE_BYPASS_COOKIE);
  });
});
