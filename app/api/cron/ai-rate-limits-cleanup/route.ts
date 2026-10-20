import { NextRequest, NextResponse } from 'next/server';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { cronSkipIfMaintenance } from '@/lib/maintenance/cron';

export const dynamic = 'force-dynamic';

/**
 * Deletes ai_rate_limits rows older than 30 days via cleanup_ai_rate_limits_30d().
 * Never touches ai_token_usage (caps / audit history).
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const skipped = await cronSkipIfMaintenance();
  if (skipped) return skipped;

  try {
    const svc = buildServiceClient();
    const { error } = await svc.rpc('cleanup_ai_rate_limits_30d');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ai rate limits cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
