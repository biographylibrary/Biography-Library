import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { verifyBiographyOwnership } from '@/lib/agents/thread-service';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { appendDraftToBiography } from '@/lib/echo/apply-draft';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { biographyId?: string; sectionKey?: string; draftText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const biographyId = body.biographyId?.trim();
  const sectionKey = body.sectionKey?.trim();
  const draftText = body.draftText?.trim();

  if (!biographyId || !sectionKey || !draftText) {
    return NextResponse.json(
      { error: 'biographyId, sectionKey and draftText are required' },
      { status: 400 }
    );
  }

  const serviceClient = buildServiceClient();
  const owned = await verifyBiographyOwnership(serviceClient, biographyId, auth.userId);
  if (!owned.ok) {
    return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
  }

  const result = await appendDraftToBiography(
    serviceClient,
    auth.userId,
    biographyId,
    sectionKey,
    draftText
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
