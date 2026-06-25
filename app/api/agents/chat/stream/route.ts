import { NextRequest } from 'next/server';
import {
  authenticateAgentRequest,
  parseAgentChatBody,
  prepareAgentTurn,
  sseEncode,
  type PreparedTurnResult,
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

  let turnResult: PreparedTurnResult;
  try {
    turnResult = await prepareAgentTurn(auth.userId, payload);
  } catch (err) {
    console.error('[agents/chat/stream] prepareAgentTurn failed:', err);
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message:
          'Echo could not start a conversation. Check server logs and Supabase agent tables.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!turnResult.ok) {
    return new Response(
      JSON.stringify({
        error: turnResult.error,
        message: turnResult.message,
      }),
      { status: turnResult.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const prepared = turnResult;

  const serviceClient = buildServiceClient();
  let threadId = prepared.threadId;
  try {
    await appendMessage(serviceClient, threadId, {
      role: 'user',
      content: prepared.userMessage,
      tool_calls: null,
    });
  } catch (err) {
    console.error('[agents/chat/stream] appendMessage failed:', err);
    return new Response(
      JSON.stringify({
        error: 'thread_error',
        message: 'Could not save message. If Echo was just deployed, apply Supabase migration 20260623120000_echo_agent_type.sql.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
            locale: prepared.locale,
            echoPage: prepared.echoPage,
            biographyMode: prepared.biographyMode,
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
