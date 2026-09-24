import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isStaffModerator } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { erasePriorContent } from '@/lib/server/erase-prior-content';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isStaffModerator(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { biographyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  if (!biographyId) {
    return NextResponse.json({ error: 'biographyId required' }, { status: 400 });
  }

  try {
    const result = await erasePriorContent(buildServiceClient(), biographyId, 'data_protection');
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
