import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCallerStaffContext = vi.fn();
const readMaintenanceStatus = vi.fn();
const writeMaintenanceEnabled = vi.fn();
const buildServiceClient = vi.fn(() => ({}));

vi.mock('@/lib/server/admin-api-auth', () => ({
  getCallerStaffContext: (...args: unknown[]) => getCallerStaffContext(...args),
  isAdminOrSuperAdmin: (role: string) => role === 'admin' || role === 'super_admin',
}));

vi.mock('@/lib/server/review-submit-pipeline', () => ({
  buildServiceClient: () => buildServiceClient(),
}));

vi.mock('@/lib/server/maintenance-settings', () => ({
  readMaintenanceStatus: (...args: unknown[]) => readMaintenanceStatus(...args),
  writeMaintenanceEnabled: (...args: unknown[]) => writeMaintenanceEnabled(...args),
}));

describe('/api/admin/maintenance', () => {
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    readMaintenanceStatus.mockResolvedValue({
      enabled: false,
      updatedAt: null,
      updatedBy: null,
      updatedByEmail: null,
      updatedByName: null,
    });
  });

  afterEach(() => {
    if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
  });

  it('GET 403 per non admin', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'u1', role: 'user' });
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/admin/maintenance'));
    expect(res.status).toBe(403);
  });

  it('GET 200 per admin', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'admin-1', role: 'admin' });
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/admin/maintenance'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ enabled: false });
    expect(res.headers.get('set-cookie')).toContain('bl_maint_bypass=');
  });

  it('PUT 403 per reviewer', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'r1', role: 'reviewer' });
    const { PUT } = await import('../route');
    const res = await PUT(
      new NextRequest('http://localhost/api/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify({ enabled: true }),
      })
    );
    expect(res.status).toBe(403);
    expect(writeMaintenanceEnabled).not.toHaveBeenCalled();
  });

  it('PUT 200 per admin', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'admin-1', role: 'super_admin' });
    writeMaintenanceEnabled.mockResolvedValue({
      ok: true,
      status: {
        enabled: true,
        updatedAt: '2026-10-21T00:00:00.000Z',
        updatedBy: 'admin-1',
        updatedByEmail: 'a@test',
        updatedByName: 'Ada',
      },
    });
    const { PUT } = await import('../route');
    const res = await PUT(
      new NextRequest('http://localhost/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
    );
    expect(res.status).toBe(200);
    expect(writeMaintenanceEnabled).toHaveBeenCalledWith(expect.anything(), true, 'admin-1');
    expect(await res.json()).toMatchObject({ enabled: true, updatedByName: 'Ada' });
  });
});
