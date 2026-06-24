import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  canManageTargetAccount,
  getCallerStaffContext,
  isAdminOrSuperAdmin,
  type StaffRole,
} from '@/lib/server/admin-api-auth';
import { sendAccountReinstatedEmail } from '@/lib/server/account-emails';

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
    .select('id, email, role, account_status, language')
    .eq('id', targetId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const targetRole = (target as { role: StaffRole }).role;
  if (!canManageTargetAccount(ctx.role, ctx.userId, targetRole, targetId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if ((target as { account_status?: string }).account_status === 'active') {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  const email = (target as { email?: string | null }).email ?? null;

  const { error: upErr } = await service
    .from('profiles')
    .update({ account_status: 'active' })
    .eq('id', targetId);

  if (upErr) {
    console.error('[admin/reinstate] profile update', upErr);
    return NextResponse.json({ error: 'Failed to reinstate account' }, { status: 500 });
  }

  const { error: unbanErr } = await service.auth.admin.updateUserById(targetId, {
    ban_duration: 'none',
  });
  if (unbanErr) {
    console.error('[admin/reinstate] unban', unbanErr);
    await service.from('profiles').update({ account_status: 'suspended' }).eq('id', targetId);
    return NextResponse.json({ error: 'Failed to reinstate account' }, { status: 500 });
  }

  if (email) {
    try {
      await sendAccountReinstatedEmail(email, (target as { language?: string }).language);
    } catch (e) {
      console.error('[admin/reinstate] email', e);
    }
  }

  await service.from('admin_action_log').insert({
    performed_by: ctx.userId,
    action_type: 'user_reinstate',
    target_type: 'user',
    target_id: targetId,
    details: { email },
  });

  return NextResponse.json({ ok: true });
}
