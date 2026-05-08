import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  canManageTargetAccount,
  getCallerStaffContext,
  isAdminOrSuperAdmin,
  type StaffRole,
} from '@/lib/server/admin-api-auth';
import { sendAccountSuspendedEmail } from '@/lib/server/account-emails';

export async function POST(
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
    .select('id, email, role, account_status')
    .eq('id', targetId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const targetRole = (target as { role: StaffRole }).role;
  if (!canManageTargetAccount(ctx.role, ctx.userId, targetRole, targetId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if ((target as { account_status?: string }).account_status === 'suspended') {
    return NextResponse.json({ ok: true, alreadySuspended: true });
  }

  const email = (target as { email?: string | null }).email ?? null;

  const { error: upErr } = await service
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('id', targetId);

  if (upErr) {
    console.error('[admin/suspend] profile update', upErr);
    return NextResponse.json({ error: 'Failed to suspend account' }, { status: 500 });
  }

  const { error: banErr } = await service.auth.admin.updateUserById(targetId, {
    ban_duration: '876600h',
  });
  if (banErr) {
    console.error('[admin/suspend] ban', banErr);
    await service.from('profiles').update({ account_status: 'active' }).eq('id', targetId);
    return NextResponse.json({ error: 'Failed to suspend account' }, { status: 500 });
  }

  if (email) {
    try {
      await sendAccountSuspendedEmail(email);
    } catch (e) {
      console.error('[admin/suspend] email', e);
    }
  }

  await service.from('admin_action_log').insert({
    performed_by: ctx.userId,
    action_type: 'user_suspend',
    target_type: 'user',
    target_id: targetId,
    details: { email },
  });

  return NextResponse.json({ ok: true });
}
