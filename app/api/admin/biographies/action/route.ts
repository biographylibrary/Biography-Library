import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext, isStaffModerator } from '@/lib/server/admin-api-auth';
import {
  ADMIN_BIOGRAPHY_ACTIONS,
  applyAdminBiographyAction,
  type AdminBiographyAction,
} from '@/lib/server/admin-biography-actions';
import { buildServiceClient } from '@/lib/server/service-client';

export const runtime = 'nodejs';

/**
 * Azioni dello staff sulle colonne riservate di una biografia: presa in carico,
 * approvazione, rifiuto, congelamento, pubblicazione forzata, rimozione.
 * Una sola porta: il browser non scrive più queste colonne.
 */
export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !isStaffModerator(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { biographyId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  const action = body.action as AdminBiographyAction | undefined;
  if (!biographyId) {
    return NextResponse.json({ error: 'biographyId required' }, { status: 400 });
  }
  if (!action || !ADMIN_BIOGRAPHY_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const result = await applyAdminBiographyAction(buildServiceClient(), {
    biographyId,
    action,
    actorId: ctx.userId,
  });
  if (result.blocked) {
    return NextResponse.json(
      { error: result.blocked.code, message: result.blocked.message },
      { status: 409 }
    );
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
