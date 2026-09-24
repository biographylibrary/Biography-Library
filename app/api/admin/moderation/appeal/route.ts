import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isStaffModerator } from '@/lib/server/admin-api-auth';
import { isBiographyPublicationStatus } from '@/lib/publication-state';
import { notifyAuthorPublicationEmail } from '@/lib/server/email/publication-helpers';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

export const dynamic = 'force-dynamic';

const OUTCOME: Record<string, { upheld: string; rejected: string }> = {
  en: { upheld: 'accepted', rejected: 'rejected' },
  it: { upheld: 'accolto', rejected: 'respinto' },
  fr: { upheld: 'accueilli', rejected: 'rejeté' },
  de: { upheld: 'angenommen', rejected: 'abgelehnt' },
};

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isStaffModerator(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { reportId?: string; outcome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const reportId = body.reportId?.trim();
  const outcome = body.outcome === 'upheld' || body.outcome === 'rejected' ? body.outcome : null;
  if (!reportId || !outcome) {
    return NextResponse.json({ error: 'Report and outcome required' }, { status: 400 });
  }

  const svc = buildServiceClient();
  const { data: report } = await svc
    .from('moderation_reports')
    .select('id, biography_id, appeal_status, biography_status_before_decision')
    .eq('id', reportId)
    .maybeSingle();
  const row = report as {
    id: string;
    biography_id: string;
    appeal_status: string | null;
    biography_status_before_decision: string | null;
  } | null;
  if (!row || row.appeal_status !== 'pending') {
    return NextResponse.json({ error: 'No open appeal' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: appealErr } = await svc
    .from('moderation_reports')
    .update({ appeal_status: outcome, appeal_decided_at: now })
    .eq('id', reportId)
    .eq('appeal_status', 'pending');
  if (appealErr) return NextResponse.json({ error: appealErr.message }, { status: 500 });

  let restored = false;
  if (
    outcome === 'upheld' &&
    row.biography_status_before_decision &&
    isBiographyPublicationStatus(row.biography_status_before_decision)
  ) {
    const { error: bioErr } = await svc
      .from('biographies')
      .update({ status: row.biography_status_before_decision })
      .eq('id', row.biography_id);
    if (bioErr) return NextResponse.json({ error: bioErr.message }, { status: 500 });
    restored = true;
  }

  const message = outcome === 'upheld'
    ? `Appeal accepted. Biography status ${restored ? `returned to ${row.biography_status_before_decision}` : 'left unchanged'}.`
    : 'Appeal rejected. The biography stays in the state of the decision.';
  await writeModerationMessage(svc, {
    reportId,
    senderId: ctx.userId,
    message,
  });

  const { data: bio } = await svc.from('biographies').select('user_id').eq('id', row.biography_id).maybeSingle();
  const authorId = (bio as { user_id?: string | null } | null)?.user_id;
  if (authorId) {
    const { data: profile } = await svc.from('profiles').select('language').eq('id', authorId).maybeSingle();
    const lang = ((profile as { language?: string | null } | null)?.language || 'en').split('-')[0];
    const words = OUTCOME[lang] ?? OUTCOME.en;
    try {
      await notifyAuthorPublicationEmail({
        client: svc,
        authorId,
        biographyId: row.biography_id,
        templateId: 'report_appeal_result',
        vars: { outcome: words[outcome] },
        notificationMessage: message,
        idempotencyKey: `report-appeal-result/${reportId}`,
      });
    } catch (err) {
      console.error('[appeal-decision] email', err);
    }
  }

  return NextResponse.json({ ok: true, restored });
}
