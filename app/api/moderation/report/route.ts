import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import type { ReportType } from '@/lib/moderation/types';

const ALLOWED_TYPES = new Set<ReportType>([
  'level1_content',
  'level2_content',
  'living_person',
  'right_to_oblivion',
  'impersonation',
  'copyright',
  'other',
]);

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { biographyId?: string; reportType?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  const reportType = body.reportType?.trim() as ReportType | undefined;
  const description = (body.description ?? '').trim().slice(0, 500) || null;

  if (!biographyId) {
    return NextResponse.json({ error: 'Biography id required' }, { status: 400 });
  }
  if (!reportType || !ALLOWED_TYPES.has(reportType)) {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }

  const { data: bio, error: bioErr } = await auth.anonClient
    .from('biographies')
    .select('id, status')
    .eq('id', biographyId)
    .maybeSingle();

  if (bioErr || !bio) {
    return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
  }

  const { error: insertErr } = await auth.anonClient.from('moderation_reports').insert({
    biography_id: biographyId,
    report_type: reportType,
    description,
    reporter_id: auth.user.id,
    status: 'unassigned',
  });

  if (insertErr) {
    console.error('[moderation/report]', insertErr);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
