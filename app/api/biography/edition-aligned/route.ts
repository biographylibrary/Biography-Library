import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/service-client';
import { originalVersionTimestamp } from '@/lib/edition-drift';
import { isUuid } from '@/lib/server/edition-create';

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { editionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const editionId = typeof body.editionId === 'string' ? body.editionId : '';
  if (!editionId) {
    return NextResponse.json({ error: 'editionId is required' }, { status: 400 });
  }
  if (!isUuid(editionId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const client = buildServiceClient();
  const { data: edition, error } = await client
    .from('biographies')
    .select('id, user_id, translation_of')
    .eq('id', editionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!edition) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const row = edition as { user_id: string; translation_of: string | null };
  if (row.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!row.translation_of) {
    return NextResponse.json({ error: 'not_an_edition' }, { status: 409 });
  }

  const { data: original, error: originalError } = await client
    .from('biographies')
    .select('revised_at, published_at')
    .eq('id', row.translation_of)
    .maybeSingle();

  if (originalError) {
    return NextResponse.json({ error: originalError.message }, { status: 500 });
  }
  if (!original) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const originalVersionAt = originalVersionTimestamp(
    original as { revised_at?: string | null; published_at?: string | null }
  );
  if (!originalVersionAt) {
    return NextResponse.json({ error: 'original_has_no_version' }, { status: 409 });
  }

  const { error: updateError } = await client
    .from('biographies')
    .update({ original_version_at: originalVersionAt })
    .eq('id', editionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, originalVersionAt });
}
