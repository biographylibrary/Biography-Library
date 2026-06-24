import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { loadThreadMessages, verifyThreadOwnership } from '@/lib/agents/thread-service';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const threadId = params.id;
  const serviceClient = buildServiceClient();
  const thread = await verifyThreadOwnership(serviceClient, threadId, auth.userId);
  if (!thread) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const messages = await loadThreadMessages(serviceClient, threadId, limit);

  return NextResponse.json({
    thread,
    messages,
  });
}
