import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { getActiveThread, loadThreadMessages } from '@/lib/agents/thread-service';
import type { AgentType } from '@/lib/agents/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const agentType = url.searchParams.get('agentType') as AgentType | null;
  const biographyId = url.searchParams.get('biographyId');

  if (!agentType || !['platform_guide', 'biography_coach', 'publication_reviewer'].includes(agentType)) {
    return NextResponse.json({ error: 'Invalid agentType' }, { status: 400 });
  }

  if ((agentType === 'biography_coach' || agentType === 'publication_reviewer') && !biographyId) {
    return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
  }

  const serviceClient = buildServiceClient();
  const thread = await getActiveThread(serviceClient, {
    userId: auth.userId,
    agentType,
    biographyId: biographyId ?? null,
  });

  if (!thread) {
    return NextResponse.json({ thread: null, messages: [] });
  }

  const messages = await loadThreadMessages(serviceClient, thread.id, 50);
  const displayMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  return NextResponse.json({ thread, messages: displayMessages });
}
