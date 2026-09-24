import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { openModerationReport } from '@/lib/server/open-moderation-report';
import {
  REPORT_ACCOUNT_MAX,
  REPORT_ACCOUNT_WINDOW_MS,
  clientIp,
  consumeReportIpSlot,
} from '@/lib/server/report-rate-limit';
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

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!consumeReportIpSlot(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

  const svc = buildServiceClient();
  const since = new Date(Date.now() - REPORT_ACCOUNT_WINDOW_MS).toISOString();
  const { count } = await svc
    .from('moderation_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', auth.user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= REPORT_ACCOUNT_MAX) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const result = await openModerationReport(svc, {
      biographyId,
      reportType,
      description,
      origin: 'in_app',
      reporterId: auth.user.id,
      reporterEmail: null,
      reporterName: null,
      senderId: auth.user.id,
    });
    return NextResponse.json({ ok: true, effect: result.effect.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit report';
    const status = message === 'Biography not found' ? 404 : 500;
    console.error('[moderation/report]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
