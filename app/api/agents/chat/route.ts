import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateAgentRequest,
  parseAgentChatBody,
  prepareAgentTurn,
} from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { appendMessage } from '@/lib/agents/thread-service';
import { chat } from '@/lib/agents/infomaniak-client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload;
  try {
    payload = await parseAgentChatBody(req);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if ('error' in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const prepared = await prepareAgentTurn(auth.userId, payload);
  if (!prepared.ok) {
    return NextResponse.json(
      { error: prepared.error, message: prepared.message },
      { status: prepared.status }
    );
  }

  const serviceClient = buildServiceClient();
  await appendMessage(serviceClient, prepared.threadId, {
    role: 'user',
    content: prepared.userMessage,
    tool_calls: null,
  });

  const messages = [
    { role: 'system' as const, content: prepared.systemPrompt },
    ...prepared.history,
    { role: 'user' as const, content: prepared.userMessage },
  ];

  try {
    const result = await chat({ role: prepared.role, messages });
    await appendMessage(serviceClient, prepared.threadId, {
      role: 'assistant',
      content: result.content,
      tool_calls: result.tool_calls ?? null,
    });
    return NextResponse.json({
      threadId: prepared.threadId,
      content: result.content,
      modelUsed: result.modelUsed,
    });
  } catch (err) {
    console.error('[agents/chat]', err);
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
  }
}
