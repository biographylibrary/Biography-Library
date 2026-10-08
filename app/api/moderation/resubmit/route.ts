import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import {
  REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
  startAnalysisJob,
} from '@/lib/server/analysis-jobs';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { screenRevisionAndAttach } from '@/lib/server/revision-screening';
import {
  buildServiceClient,
  checkPerUserThrottle,
} from '@/lib/server/review-submit-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { biographyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const biographyId = body.biographyId?.trim();
  if (!biographyId) return NextResponse.json({ error: 'Biography id required' }, { status: 400 });

  const svc = buildServiceClient();

  if (!(await checkPerUserThrottle(svc, auth.user.id, 'moderation_resubmit'))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: moved, error } = await svc
    .from('biographies')
    .update({ status: 'revision_pending_review' })
    .eq('id', biographyId)
    .eq('user_id', auth.user.id)
    .eq('status', 'revision_requested')
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!moved) return NextResponse.json({ error: 'Nothing to resubmit' }, { status: 400 });

  const { data: report } = await svc
    .from('moderation_reports')
    .select('id')
    .eq('biography_id', biographyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const reportId = (report as { id: string } | null)?.id ?? null;
  if (reportId) {
    await writeModerationMessage(svc, {
      reportId,
      senderId: auth.user.id,
      message: 'The author sent the revision. The biography stays out of the catalog until a reviewer accepts it.',
    });
  }

  // Screening del testo corretto in background: non pubblica; allega l'esito al rapporto.
  // L'invio dell'autore non aspetta il lavoro. ai_screening_status non si tocca
  // (scheda in revision_pending_review). Se l'avvio del lavoro fallisce, lo stato
  // è già revision_pending_review: rispondi ok e segnala nel rapporto.
  try {
    await startAnalysisJob(
      svc,
      biographyId,
      'screening',
      async () => {
        const attached = await screenRevisionAndAttach(svc, {
          biographyId,
          reportId,
          authorId: auth.user.id,
        });
        if (!attached.ok) throw new Error('revision_screening_attach_failed');
        return { ok: true, verdict: attached.verdict ?? null };
      },
      { reportId, authorId: auth.user.id }
    );
  } catch (err) {
    console.error('[moderation/resubmit] startAnalysisJob failed', err);
    if (reportId) {
      try {
        await writeModerationMessage(svc, {
          reportId,
          senderId: auth.user.id,
          internal: true,
          message: REVISION_SCREENING_COULD_NOT_RUN_MESSAGE,
        });
      } catch (messageErr) {
        console.error('[moderation/resubmit] interrupt message failed', messageErr);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
