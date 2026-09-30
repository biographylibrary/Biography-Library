import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCallerStaffContext = vi.fn();
const applyAdminBiographyAction = vi.fn();

vi.mock('@/lib/server/admin-api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/admin-api-auth')>();
  return { ...actual, getCallerStaffContext: (...a: unknown[]) => getCallerStaffContext(...a) };
});
vi.mock('@/lib/server/admin-biography-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/admin-biography-actions')>();
  return { ...actual, applyAdminBiographyAction: (...a: unknown[]) => applyAdminBiographyAction(...a) };
});
vi.mock('@/lib/server/service-client', () => ({ buildServiceClient: () => ({}) }));

import { POST } from '@/app/api/admin/biographies/action/route';

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/biographies/action', {
    method: 'POST',
    headers: { authorization: 'Bearer jwt' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  applyAdminBiographyAction.mockResolvedValue({ error: null, status: 'published' });
});

describe('POST /api/admin/biographies/action', () => {
  it('rifiuta chi non è staff', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'u1', role: 'user' });
    expect((await POST(req({ biographyId: 'b1', action: 'approve' }))).status).toBe(403);
    getCallerStaffContext.mockResolvedValue(null);
    expect((await POST(req({ biographyId: 'b1', action: 'approve' }))).status).toBe(403);
    expect(applyAdminBiographyAction).not.toHaveBeenCalled();
  });

  it('esegue l\'azione per lo staff con il suo id', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'staff-1', role: 'reviewer' });
    const res = await POST(req({ biographyId: 'b1', action: 'approve' }));
    expect(res.status).toBe(200);
    expect(applyAdminBiographyAction).toHaveBeenCalledWith(expect.anything(), {
      biographyId: 'b1',
      action: 'approve',
      actorId: 'staff-1',
    });
  });

  it('rifiuta azioni sconosciute e richieste senza id', async () => {
    getCallerStaffContext.mockResolvedValue({ userId: 'staff-1', role: 'admin' });
    expect((await POST(req({ biographyId: 'b1', action: 'explode' }))).status).toBe(400);
    expect((await POST(req({ action: 'approve' }))).status).toBe(400);
  });
});
