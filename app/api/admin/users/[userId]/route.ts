import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  canManageTargetAccount,
  getCallerStaffContext,
  isAdminOrSuperAdmin,
  type StaffRole,
} from '@/lib/server/admin-api-auth';
import { sendAccountDeletedEmail } from '@/lib/server/account-emails';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const targetId = params.userId;
  const ctx = await getCallerStaffContext(_req);
  if (!ctx || !isAdminOrSuperAdmin(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = buildServiceClient();
  const { data: target, error: targetErr } = await service
    .from('profiles')
    .select('id, email, role')
    .eq('id', targetId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const targetRole = (target as { role: StaffRole }).role;
  if (!canManageTargetAccount(ctx.role, ctx.userId, targetRole, targetId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const email = (target as { email?: string | null }).email ?? null;

  if (email) {
    try {
      await sendAccountDeletedEmail(email);
    } catch (e) {
      console.error('[admin/delete user] email', e);
    }
  }

  const { error: delErr } = await service.auth.admin.deleteUser(targetId);
  if (delErr) {
    console.error('[admin/delete user] auth delete', delErr);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  await service.from('admin_action_log').insert({
    performed_by: ctx.userId,
    action_type: 'user_delete',
    target_type: 'user',
    target_id: targetId,
    details: { email },
  });

  return NextResponse.json({ ok: true });
}
