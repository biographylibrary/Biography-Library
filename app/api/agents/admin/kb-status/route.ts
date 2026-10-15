import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isAdminOrSuperAdmin } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { getKbIndexDrift } from '@/lib/agents/rag/kb-index-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Confronto hash/versione KB indicizzata vs build (admin). */
export async function GET(req: NextRequest) {
  const staff = await getCallerStaffContext(req);
  if (!staff || !isAdminOrSuperAdmin(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const drift = await getKbIndexDrift(buildServiceClient(), 'en');
    return NextResponse.json(drift);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'kb status failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
