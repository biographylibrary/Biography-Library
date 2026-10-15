import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/service-client';
import { setAiFeaturesEnabled } from '@/lib/server/ai-features-preference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Preferenza account: funzioni IA on/off.
 * Spegnendo: flag a false subito, poi purge memoria Echo su tutte le biografie
 * dell'utente (edizioni incluse). Thread hub senza biography_id non toccati.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }

  const result = await setAiFeaturesEnabled(buildServiceClient(), auth.user.id, body.enabled);

  if (!result.ok) {
    if (result.error === 'memory_purge_failed') {
      return NextResponse.json(
        {
          error: 'memory_purge_failed',
          enabled: false,
          purgedBiographyIds: result.purgedBiographyIds,
          failedBiographyIds: result.failedBiographyIds,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: result.error, message: result.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    enabled: result.enabled,
    purgedBiographyIds: result.purgedBiographyIds,
  });
}
