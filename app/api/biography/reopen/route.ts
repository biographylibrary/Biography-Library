import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { reopenPublishedBiography } from '@/lib/server/biography-reopen';
import { buildServiceClient } from '@/lib/server/service-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Riapre la propria scheda pubblicata per scrivere un nuovo capitolo (published ->
 * draft), se il tempo di attesa fra capitoli è trascorso. Vedi lib/server/biography-reopen.ts
 * per il limite noto (la scheda sparisce dal catalogo durante la scrittura).
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const result = await reopenPublishedBiography(buildServiceClient(), {
    biographyId,
    userId: auth.user.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.availableAt ? { availableAt: result.availableAt } : {}) },
      { status: result.httpStatus }
    );
  }
  return NextResponse.json({ ok: true, status: result.status });
}
