import { NextRequest } from 'next/server';
import {
  authenticateAgentRequest,
  parseAgentChatBody,
  prepareAgentTurn,
  sseEncode,
} from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { appendMessage } from '@/lib/agents/thread-service';
import { runStreamingAgentTurn } from '@/lib/agents/run-agent-turn';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload;
  try {
    payload = await parseAgentChatBody(req);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if ('error' in payload) {
    return new Response(JSON.stringify({ error: payload.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prepared = await prepareAgentTurn(auth.userId, payload);
  if (!prepared.ok) {
    return new Response(
      JSON.stringify({
        error: prepared.error,
        message: prepared.message,
      }),
      { status: prepared.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const serviceClient = buildServiceClient();
  await appendMessage(serviceClient, prepared.threadId, {
    role: 'user',
    content: prepared.userMessage,
    tool_calls: null,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      try {
        send('thread', { threadId: prepared.threadId });
        if (prepared.kbSources?.length) {
          send('kb_sources', { sources: prepared.kbSources });
        }
        await runStreamingAgentTurn(
          {
            threadId: prepared.threadId,
            history: prepared.history,
            userMessage: prepared.userMessage,
            systemPrompt: prepared.systemPrompt,
            role: prepared.role,
            agentType: prepared.agentType,
            tools: prepared.tools,
            biographyId: prepared.biographyId,
            userId: prepared.userId,
          },
          serviceClient,
          send
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream failed';
        console.error('[agents/chat/stream]', err);
        send('error', { message: msg.slice(0, 300) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
