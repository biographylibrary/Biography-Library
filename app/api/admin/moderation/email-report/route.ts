import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isStaffModerator } from '@/lib/server/admin-api-auth';
import { openModerationReport } from '@/lib/server/open-moderation-report';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import type { ReportType } from '@/lib/moderation/types';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set<ReportType>([
  'level1_content',
  'living_person',
  'illegal_content',
  'right_to_oblivion',
  'sensitive_personal_data',
  'defamation',
  'impersonation',
  'copyright',
  'other',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isStaffModerator(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    biographyId?: string;
    reportType?: string;
    description?: string;
    reporterEmail?: string;
    reporterName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  const reportType = body.reportType?.trim() as ReportType | undefined;
  const reporterName = body.reporterName?.trim().slice(0, 200) || '';
  const reporterEmail = body.reporterEmail?.trim().slice(0, 320) || '';
  const description = (body.description ?? '').trim().slice(0, 2000) || null;

  if (!biographyId) {
    return NextResponse.json({ error: 'Biography id required' }, { status: 400 });
  }
  if (!reportType || !ALLOWED_TYPES.has(reportType)) {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }
  if (!reporterName || !EMAIL_RE.test(reporterEmail)) {
    return NextResponse.json({ error: 'Reporter name and email required' }, { status: 400 });
  }

  try {
    const result = await openModerationReport(buildServiceClient(), {
      biographyId,
      reportType,
      description,
      origin: 'email_channel',
      reporterId: null,
      reporterEmail,
      reporterName,
      senderId: ctx.userId,
    });
    return NextResponse.json({ ok: true, reportId: result.reportId, effect: result.effect.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to open report';
    const status = message === 'Biography not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
