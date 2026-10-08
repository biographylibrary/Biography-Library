import { NextRequest, NextResponse } from 'next/server';
import { sweepStaleAnalysisJobs } from '@/lib/server/analysis-jobs';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const interrupted = await sweepStaleAnalysisJobs(buildServiceClient());
    return NextResponse.json({ interrupted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis jobs sweep failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
