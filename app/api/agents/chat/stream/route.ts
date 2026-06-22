import { NextRequest } from 'next/server';
import {
  authenticateAgentRequest,
  parseAgentChatBody,
  prepareAgentTurn,
  sseEncode,
} from '@/lib/agents/agent-chat-handler';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { appendMessage } from '@/lib/agents/thread-service';
import { chatStream } from '@/lib/agents/infomaniak-client';

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

  const messages = [
    { role: 'system' as const, content: prepared.systemPrompt },
    ...prepared.history,
    { role: 'user' as const, content: prepared.userMessage },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      try {
        send('thread', { threadId: prepared.threadId });
        let fullContent = '';

        for await (const chunk of chatStream({
          role: prepared.role,
          messages,
          stream: true,
        })) {
          if (chunk.type === 'token' && chunk.content) {
            fullContent += chunk.content;
            send('token', { content: chunk.content });
          }
        }

        await appendMessage(serviceClient, prepared.threadId, {
          role: 'assistant',
          content: fullContent,
          tool_calls: null,
        });

        send('done', { threadId: prepared.threadId });
      } catch (err) {
        console.error('[agents/chat/stream]', err);
        send('error', { message: 'Stream failed' });
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
