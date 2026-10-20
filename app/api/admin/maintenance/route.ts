import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isAdminOrSuperAdmin } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  readMaintenanceStatus,
  writeMaintenanceEnabled,
} from '@/lib/server/maintenance-settings';
import {
  createMaintenanceBypassValue,
  maintenanceBypassCookieHeader,
} from '@/lib/maintenance/bypass';
import { clearMaintenanceFlagCache } from '@/lib/maintenance/flag';

export const dynamic = 'force-dynamic';

async function withBypassCookie(res: NextResponse, userId: string): Promise<NextResponse> {
  const value = await createMaintenanceBypassValue(userId);
  if (value) {
    res.headers.append('Set-Cookie', maintenanceBypassCookieHeader(value));
  }
  return res;
}

export async function GET(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isAdminOrSuperAdmin(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = await readMaintenanceStatus(buildServiceClient());
  return withBypassCookie(NextResponse.json(status), ctx.userId);
}

export async function PUT(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isAdminOrSuperAdmin(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { enabled?: unknown };
  try {
    body = (await req.json()) as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }

  const result = await writeMaintenanceEnabled(buildServiceClient(), body.enabled, ctx.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  clearMaintenanceFlagCache();
  return withBypassCookie(NextResponse.json(result.status), ctx.userId);
}
