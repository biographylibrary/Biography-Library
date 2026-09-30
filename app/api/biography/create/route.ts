import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { mintUmIdFor } from '@/lib/server/um-id-registry';
import { ONE_BIOGRAPHY_PER_USER_ERROR } from '@/lib/biography-limits';
import { buildBiographyInsertPayload, type CreateBiographyBody } from '@/lib/server/biography-create-payload';

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: CreateBiographyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const built = buildBiographyInsertPayload(auth.user.id, body, new Date().toISOString());
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }
  const insertPayload = built.payload;

  const { data, error } = await auth.anonClient
    .from('biographies')
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) {
    const message = error.message ?? '';
    if (message.includes('one_biography_per_user')) {
      return NextResponse.json({ error: ONE_BIOGRAPHY_PER_USER_ERROR }, { status: 409 });
    }
    if (message.includes('licenza registrata')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 });
  }

  try {
    const minted = await mintUmIdFor(buildServiceClient(), data.id as string);
    const { data: withUm, error: refetchError } = await auth.anonClient
      .from('biographies')
      .select()
      .eq('id', data.id)
      .maybeSingle();

    if (refetchError) {
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: withUm ?? { ...data, um_id: minted.umIdNormalized },
      umIdCanonical: minted.umIdCanonical,
    });
  } catch (mintErr) {
    const msg = mintErr instanceof Error ? mintErr.message : 'UM mint failed';
    return NextResponse.json({ error: msg, data }, { status: 500 });
  }
}
