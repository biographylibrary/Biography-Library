import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import {
  appendMessage,
  getActiveThread,
  getOrCreateThread,
  getAgentUiMessageLimit,
  loadRecentThreadMessages,
  verifyBiographyOwnership,
} from '@/lib/agents/thread-service';
import type { AgentType } from '@/lib/agents/models';
import { getEchoUsageGuideForLocale } from '@/lib/i18n/echo-guide-content';
import type { Language } from '@/lib/i18n/translations';
import { wrapUsageGuideContent, isUsageGuideContent } from '@/lib/echo/echo-usage-guide';

export const runtime = 'nodejs';

function resolveLocale(raw: string | null): Language {
  const code = (raw ?? 'en').slice(0, 2).toLowerCase();
  if (code === 'it' || code === 'fr' || code === 'de' || code === 'en') return code;
  return 'en';
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const agentType = url.searchParams.get('agentType') as AgentType | null;
  const biographyId = url.searchParams.get('biographyId');
  const locale = resolveLocale(url.searchParams.get('locale'));

  if (!agentType || !['platform_guide', 'biography_coach', 'publication_reviewer', 'echo'].includes(agentType)) {
    return NextResponse.json({ error: 'Invalid agentType' }, { status: 400 });
  }

  if ((agentType === 'biography_coach' || agentType === 'publication_reviewer') && !biographyId) {
    return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
  }

  const serviceClient = buildServiceClient();

  if (biographyId) {
    const ownership = await verifyBiographyOwnership(serviceClient, biographyId, auth.userId);
    if (!ownership.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let thread =
    agentType === 'echo'
      ? await getActiveThread(serviceClient, {
          userId: auth.userId,
          agentType,
          biographyId: biographyId ?? null,
        })
      : await getActiveThread(serviceClient, {
          userId: auth.userId,
          agentType,
          biographyId: biographyId ?? null,
        });

  if (agentType === 'echo' && !thread) {
    thread = await getOrCreateThread(serviceClient, {
      userId: auth.userId,
      agentType: 'echo',
      biographyId: biographyId ?? null,
      locale,
    });
  }

  if (!thread) {
    return NextResponse.json({ thread: null, messages: [] });
  }

  const uiLimit = getAgentUiMessageLimit();
  let messages = await loadRecentThreadMessages(serviceClient, thread.id, uiLimit);
  let displayMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

  const { count: totalMessageCount } = await serviceClient
    .from('agent_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', thread.id);

  const hasMoreOlder = (totalMessageCount ?? 0) > messages.length;

  if (
    agentType === 'echo' &&
    displayMessages.length === 0
  ) {
    const guideRow = await appendMessage(serviceClient, thread.id, {
      role: 'assistant',
      content: wrapUsageGuideContent(getEchoUsageGuideForLocale(locale)),
      tool_calls: null,
    });
    displayMessages = [guideRow];
  } else if (agentType === 'echo') {
    const hasUsageGuide = displayMessages.some((m) => isUsageGuideContent(m.content));
    const hasUser = displayMessages.some((m) => m.role === 'user');
    if (!hasUsageGuide && !hasUser) {
      const guideRow = await appendMessage(serviceClient, thread.id, {
        role: 'assistant',
        content: wrapUsageGuideContent(getEchoUsageGuideForLocale(locale)),
        tool_calls: null,
      });
      displayMessages = [guideRow, ...displayMessages];
    }
  }

  return NextResponse.json({
    thread,
    messages: displayMessages,
    hasMoreOlder,
    oldestLoadedAt: messages[0]?.created_at ?? null,
  });
}
