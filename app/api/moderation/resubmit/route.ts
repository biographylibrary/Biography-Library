import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

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
  if (report) {
    await writeModerationMessage(svc, {
      reportId: (report as { id: string }).id,
      senderId: auth.user.id,
      message: 'The author sent the revision. The biography stays out of the catalog until a reviewer accepts it.',
    });
  }

  return NextResponse.json({ ok: true });
}
