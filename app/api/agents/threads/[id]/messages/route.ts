import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  getAgentUiMessageLimit,
  loadRecentThreadMessages,
  loadThreadMessagesBefore,
  verifyThreadOwnership,
} from '@/lib/agents/thread-service';
import { enrichMessagesWithPendingDrafts } from '@/lib/echo/echo-thread-pending-drafts';

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
  const before = url.searchParams.get('before');
  const maxLimit = getAgentUiMessageLimit();
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), maxLimit);

  const messages = before
    ? await loadThreadMessagesBefore(serviceClient, threadId, before, limit)
    : await loadRecentThreadMessages(serviceClient, threadId, limit);

  const displayMessages =
    thread.agent_type === 'echo'
      ? enrichMessagesWithPendingDrafts(messages)
      : messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  let hasMoreOlder = false;
  if (messages.length > 0) {
    const oldestAt = messages[0].created_at;
    const { count } = await serviceClient
      .from('agent_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId)
      .lt('created_at', oldestAt);
    hasMoreOlder = (count ?? 0) > 0;
  }

  return NextResponse.json({
    thread,
    messages: displayMessages,
    hasMoreOlder,
    oldestLoadedAt: messages[0]?.created_at ?? null,
  });
}
