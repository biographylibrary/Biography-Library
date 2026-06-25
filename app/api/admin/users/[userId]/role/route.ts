import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  canManageTargetAccount,
  getCallerStaffContext,
  isAdminOrSuperAdmin,
  type StaffRole,
} from '@/lib/server/admin-api-auth';

const ALLOWED_ROLES = new Set(['user', 'reviewer', 'admin', 'super_admin']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const targetId = params.userId;
  const ctx = await getCallerStaffContext(req);
  if (!ctx || ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const newRole = body.role?.trim();
  if (!newRole || !ALLOWED_ROLES.has(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (targetId === ctx.userId) {
    return NextResponse.json({ error: 'Cannot change own role' }, { status: 400 });
  }

  const service = buildServiceClient();
  const { data: target, error: targetErr } = await service
    .from('profiles')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldRole = (target as { role: StaffRole }).role;
  if (!canManageTargetAccount(ctx.role, ctx.userId, oldRole, targetId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: upErr } = await service
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetId);

  if (upErr) {
    console.error('[admin/role] profile update', upErr);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  await service.from('role_change_log').insert({
    changed_by: ctx.userId,
    target_user: targetId,
    old_role: oldRole,
    new_role: newRole,
  });

  return NextResponse.json({ ok: true, role: newRole });
}
