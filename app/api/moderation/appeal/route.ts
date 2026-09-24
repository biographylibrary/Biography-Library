import { NextRequest, NextResponse } from 'next/server';
import { appealWindowOpen } from '@/lib/moderation/report-deadlines';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { sendTemplateEmail } from '@/lib/server/email';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { biographyId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  const reason = (body.reason ?? '').trim().slice(0, 2000);
  if (!biographyId || !reason) {
    return NextResponse.json({ error: 'Biography and reason required' }, { status: 400 });
  }

  const svc = buildServiceClient();
  const { data: bio } = await svc
    .from('biographies')
    .select('id, user_id, title, status')
    .eq('id', biographyId)
    .maybeSingle();
  if (!bio || (bio as { user_id: string }).user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: report } = await svc
    .from('moderation_reports')
    .select('id, decided_at, appeal_status')
    .eq('biography_id', biographyId)
    .not('decided_at', 'is', null)
    .order('decided_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = report as { id: string; decided_at: string | null; appeal_status: string | null } | null;
  if (!row || !appealWindowOpen(row.decided_at, new Date(), row.appeal_status)) {
    return NextResponse.json({ error: 'Appeal window closed' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await svc
    .from('moderation_reports')
    .update({
      appeal_status: 'pending',
      appeal_submitted_at: now,
      appeal_reason: reason,
    })
    .eq('id', row.id)
    .is('appeal_status', null);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await writeModerationMessage(svc, {
    reportId: row.id,
    senderId: auth.user.id,
    message: `Appeal filed. The biography stays ${String((bio as { status: string }).status)} until the appeal is decided. ${reason}`,
  });

  const { data: staff } = await svc
    .from('profiles')
    .select('id, email, language')
    .in('role', ['reviewer', 'admin', 'super_admin']);
  for (const person of staff ?? []) {
    const reviewer = person as { email?: string | null; language?: string | null };
    if (!reviewer.email) continue;
    try {
      await sendTemplateEmail({
        to: reviewer.email,
        templateId: 'report_appeal_opened',
        locale: reviewer.language,
        vars: { biographyTitle: (bio as { title?: string | null }).title ?? '' },
        idempotencyKey: `report-appeal-opened/${row.id}/${reviewer.email}`,
      });
    } catch (err) {
      console.error('[appeal] reviewer email', err);
    }
  }

  return NextResponse.json({ ok: true });
}
