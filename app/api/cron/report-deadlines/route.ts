import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { runReportDeadlines } from '@/lib/server/report-deadlines-run';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runReportDeadlines(buildServiceClient());
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'report deadlines failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
