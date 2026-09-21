import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { getCallerStaffContext, isAdminOrSuperAdmin } from '@/lib/server/admin-api-auth';
import { grantWaitlistAccess } from '@/lib/server/waitlist-grant';
import { GRANT_ACCESS_BATCH_SIZE } from '@/lib/waitlist';

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isAdminOrSuperAdmin(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { userIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id): id is string => typeof id === 'string')
    : [];

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds required' }, { status: 400 });
  }
  if (userIds.length > GRANT_ACCESS_BATCH_SIZE) {
    return NextResponse.json(
      { error: `At most ${GRANT_ACCESS_BATCH_SIZE} ids per request` },
      { status: 400 }
    );
  }

  try {
    const result = await grantWaitlistAccess({
      service: buildServiceClient(),
      userIds,
      performedBy: ctx.userId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[grant-access]', e);
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }
}
