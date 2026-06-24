import { SupabaseClient } from '@supabase/supabase-js';
import {
  chat,
  chatStream,
  type ChatMessage,
  type ToolDefinition,
} from '@/lib/agents/infomaniak-client';
import type { AgentRole, AgentType } from '@/lib/agents/models';
import { appendMessage } from '@/lib/agents/thread-service';
import { maybeCompressThreadMemory } from '@/lib/agents/thread-memory';
import { executeCoachTool } from '@/lib/agents/tools/coach-tools';
import { executeReviewerTool } from '@/lib/agents/tools/reviewer-tools';
import { executeEchoTool } from '@/lib/agents/tools/echo-tools';

export type PreparedAgentTurn = {
  threadId: string;
  history: ChatMessage[];
  userMessage: string;
  systemPrompt: string;
  role: AgentRole;
  agentType: AgentType;
  tools?: ToolDefinition[];
  biographyId?: string;
  userId: string;
  echoPage?: string;
  biographyMode?: 'sections' | 'freeflow';
};

export function historyToChatMessages(
  rows: { role: string; content: string; tool_calls?: unknown }[]
): ChatMessage[] {
  return rows
    .filter((r) => ['user', 'assistant', 'tool'].includes(r.role))
    .map((r) => {
      if (r.role === 'tool') {
        const tc = r.tool_calls as { tool_call_id?: string } | null;
        return {
          role: 'tool' as const,
          content: r.content,
          tool_call_id: tc?.tool_call_id ?? '',
        };
      }
      if (r.role === 'assistant' && r.tool_calls) {
        return {
          role: 'assistant' as const,
          content: r.content,
          tool_calls: r.tool_calls as import('@/lib/agents/infomaniak-client').ToolCall[],
        };
      }
      return {
        role: r.role as 'user' | 'assistant',
        content: r.content,
      };
    });
}

export async function runStreamingAgentTurn(
  prepared: PreparedAgentTurn,
  serviceClient: SupabaseClient,
  send: (event: string, data: unknown) => void
): Promise<void> {
  const messages: ChatMessage[] = [
    { role: 'system', content: prepared.systemPrompt },
    ...prepared.history,
    { role: 'user', content: prepared.userMessage },
  ];

  const finishTurn = () => {
    send('done', { threadId: prepared.threadId });
    void maybeCompressThreadMemory(serviceClient, prepared.threadId).catch((err) => {
      console.warn('[agents] thread memory compression failed:', err);
    });
  };

  const streamTokens = async (msgs: ChatMessage[]) => {
    let fullContent = '';
    try {
      for await (const chunk of chatStream({
        role: prepared.role,
        messages: msgs,
        stream: true,
      })) {
        if (chunk.type === 'token' && chunk.content) {
          fullContent += chunk.content;
          send('token', { content: chunk.content });
        }
      }
    } catch (streamErr) {
      console.warn('[agents] chatStream failed, falling back to non-stream:', streamErr);
      const result = await chat({
        role: prepared.role,
        messages: msgs,
        stream: false,
      });
      fullContent = result.content ?? '';
      if (fullContent) send('token', { content: fullContent });
    }

    if (!fullContent.trim()) {
      throw new Error('AI returned an empty response');
    }

    await appendMessage(serviceClient, prepared.threadId, {
      role: 'assistant',
      content: fullContent,
      tool_calls: null,
    });
    return fullContent;
  };

  if (prepared.tools?.length && (prepared.biographyId || prepared.agentType === 'echo')) {
    let first;
    try {
      first = await chat({
        role: prepared.role,
        messages,
        tools: prepared.tools,
        tool_choice: 'auto',
        stream: false,
      });
    } catch (toolErr) {
      console.warn('[agents] tool pass failed, continuing without tools:', toolErr);
      await streamTokens(messages);
      finishTurn();
      return;
    }

    if (first.tool_calls?.length) {
      await appendMessage(serviceClient, prepared.threadId, {
        role: 'assistant',
        content: first.content ?? '',
        tool_calls: first.tool_calls,
      });

      const afterTools: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: first.content ?? '',
          tool_calls: first.tool_calls,
        },
      ];

      for (const tc of first.tool_calls) {
        let content: string;
        let event: { tool: string; sectionKey?: string; contentLength?: number } | undefined;

        if (prepared.agentType === 'echo') {
          const result = await executeEchoTool(tc.function.name, tc.function.arguments, {
            serviceClient,
            userId: prepared.userId,
            biographyId: prepared.biographyId,
            echoPage: prepared.echoPage,
            biographyMode: prepared.biographyMode,
          });
          content = result.content;
          event = result.event;
        } else {
          const execTool =
            prepared.agentType === 'publication_reviewer' ? executeReviewerTool : executeCoachTool;
          const result = await execTool(tc.function.name, tc.function.arguments, {
            serviceClient,
            userId: prepared.userId,
            biographyId: prepared.biographyId!,
          });
          content = result.content;
          event = result.event;
        }
        if (event) send('tool_result', event);
        await appendMessage(serviceClient, prepared.threadId, {
          role: 'tool',
          content,
          tool_calls: { tool_call_id: tc.id },
        });
        afterTools.push({
          role: 'tool',
          content,
          tool_call_id: tc.id,
        });
      }

      await streamTokens(afterTools);
      finishTurn();
      return;
    }

    if (first.content) {
      send('token', { content: first.content });
      await appendMessage(serviceClient, prepared.threadId, {
        role: 'assistant',
        content: first.content,
        tool_calls: null,
      });
      finishTurn();
      return;
    }
  }

  await streamTokens(messages);
  finishTurn();
}
