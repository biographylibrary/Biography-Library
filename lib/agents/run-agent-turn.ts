import { SupabaseClient } from '@supabase/supabase-js';
import {
  chat,
  chatStream,
  type ChatMessage,
  type ToolDefinition,
} from '@/lib/agents/infomaniak-client';
import type { AgentRole, AgentType } from '@/lib/agents/models';
import { appendMessage } from '@/lib/agents/thread-service';
import { executeCoachTool } from '@/lib/agents/tools/coach-tools';

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

  if (prepared.tools?.length && prepared.biographyId) {
    const first = await chat({
      role: prepared.role,
      messages,
      tools: prepared.tools,
      tool_choice: 'auto',
      stream: false,
    });

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
        const { content, event } = await executeCoachTool(
          tc.function.name,
          tc.function.arguments,
          {
            serviceClient,
            userId: prepared.userId,
            biographyId: prepared.biographyId,
          }
        );
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
      send('done', { threadId: prepared.threadId });
      return;
    }

    if (first.content) {
      send('token', { content: first.content });
      await appendMessage(serviceClient, prepared.threadId, {
        role: 'assistant',
        content: first.content,
        tool_calls: null,
      });
      send('done', { threadId: prepared.threadId });
      return;
    }
  }

  await streamTokens(messages);
  send('done', { threadId: prepared.threadId });
}
