import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isAdminOrSuperAdmin } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { seedHelpKb, pruneStaleKbChunks } from '@/lib/agents/rag/kb-rag';

export const runtime = 'nodejs';

/** One-time or incremental re-index of help KB chunks (admin only). */
export async function POST(req: NextRequest) {
  const staff = await getCallerStaffContext(req);
  if (!staff || !isAdminOrSuperAdmin(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const serviceClient = buildServiceClient();
    const pruned = await pruneStaleKbChunks(serviceClient);
    const result = await seedHelpKb(serviceClient);
    return NextResponse.json({ ok: true, pruned, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seed failed';
    console.error('[agents/admin/seed-kb]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
