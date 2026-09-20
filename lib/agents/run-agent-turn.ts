import { SupabaseClient } from '@supabase/supabase-js';
import {
  chat,
  chatStream,
  extractTextContent,
  type ChatMessage,
  type ToolCall,
  type ToolDefinition,
} from '@/lib/agents/infomaniak-client';
import type { AgentRole, AgentType } from '@/lib/agents/models';
import { appendMessage, updateAssistantMessageContent } from '@/lib/agents/thread-service';
import { maybeCompressThreadMemory } from '@/lib/agents/thread-memory';
import { executeCoachTool } from '@/lib/agents/tools/coach-tools';
import { executeReviewerTool } from '@/lib/agents/tools/reviewer-tools';
import {
  executeEchoTool,
  type EchoToolResultEvent,
} from '@/lib/agents/tools/echo-tools';

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
  locale?: string;
  echoPage?: string;
  biographyMode?: 'sections' | 'freeflow';
};

const MAX_TOOL_ROUNDS = 5;

const DRAFT_ACK: Record<string, string> = {
  en: "I've prepared a draft you can review and insert below.",
  it: 'Ho preparato una bozza che puoi rivedere e inserire qui sotto.',
  fr: 'J\'ai préparé un brouillon que vous pouvez relire et insérer ci-dessous.',
  de: 'Ich habe einen Entwurf vorbereitet, den Sie unten prüfen und einfügen können.',
};

function draftAck(locale?: string): string {
  const lang = (locale ?? 'en').slice(0, 2);
  return DRAFT_ACK[lang] ?? DRAFT_ACK.en;
}

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

type SendFn = (event: string, data: unknown) => void;

async function executeToolCall(
  tc: ToolCall,
  prepared: PreparedAgentTurn,
  serviceClient: SupabaseClient
): Promise<{ content: string; event?: EchoToolResultEvent }> {
  if (prepared.agentType === 'echo') {
    return executeEchoTool(tc.function.name, tc.function.arguments, {
      serviceClient,
      userId: prepared.userId,
      biographyId: prepared.biographyId,
      echoPage: prepared.echoPage,
      biographyMode: prepared.biographyMode,
    });
  }

  const execTool =
    prepared.agentType === 'publication_reviewer' ? executeReviewerTool : executeCoachTool;
  return execTool(tc.function.name, tc.function.arguments, {
    serviceClient,
    userId: prepared.userId,
    biographyId: prepared.biographyId!,
  });
}

function isDraftPreviewEvent(event?: EchoToolResultEvent): boolean {
  return event?.tool === 'propose_draft' && Boolean(event.preview && event.draftText);
}

async function streamOrFetchText(
  messages: ChatMessage[],
  prepared: PreparedAgentTurn,
  send: SendFn
): Promise<string> {
  let fullContent = '';
  try {
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
  } catch (streamErr) {
    console.warn('[agents] chatStream failed, falling back to non-stream:', streamErr);
  }

  if (!fullContent.trim()) {
    const result = await chat({
      role: prepared.role,
      messages,
      stream: false,
    });
    fullContent = extractTextContent(result.content);
    if (fullContent.trim()) {
      send('token', { content: fullContent });
    }
  }

  return fullContent.trim();
}

async function persistAssistantText(
  serviceClient: SupabaseClient,
  threadId: string,
  text: string
): Promise<void> {
  await appendMessage(serviceClient, threadId, {
    role: 'assistant',
    content: text,
    tool_calls: null,
  });
}

async function emitAssistantText(
  text: string,
  prepared: PreparedAgentTurn,
  serviceClient: SupabaseClient,
  send: SendFn
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  send('token', { content: trimmed });
  await persistAssistantText(serviceClient, prepared.threadId, trimmed);
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

  const toolsEnabled =
    Boolean(prepared.tools?.length) &&
    (Boolean(prepared.biographyId) || prepared.agentType === 'echo');

  let hadDraftPreview = false;
  let draftAssistantMessageId: string | null = null;
  let draftDisplayPrefix = '';

  if (toolsEnabled) {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let result;
      try {
        result = await chat({
          role: prepared.role,
          messages,
          tools: prepared.tools,
          tool_choice: 'auto',
          stream: false,
        });
      } catch (toolErr) {
        console.warn('[agents] tool pass failed, continuing without tools:', toolErr);
        break;
      }

      if (result.tool_calls?.length) {
        const assistantContent = extractTextContent(result.content).trim();
        const assistantRow = await appendMessage(serviceClient, prepared.threadId, {
          role: 'assistant',
          content: assistantContent,
          tool_calls: result.tool_calls,
        });
        messages.push({
          role: 'assistant',
          content: assistantContent,
          tool_calls: result.tool_calls,
        });

        if (assistantContent) {
          draftDisplayPrefix = draftDisplayPrefix
            ? `${draftDisplayPrefix}\n\n${assistantContent}`
            : assistantContent;
          send('token', { content: assistantContent });
        }

        for (const tc of result.tool_calls) {
          const { content, event } = await executeToolCall(tc, prepared, serviceClient);
          if (event) {
            send('tool_result', { ...event, assistantMessageId: assistantRow.id });
            if (isDraftPreviewEvent(event)) {
              hadDraftPreview = true;
              draftAssistantMessageId = assistantRow.id;
            }
          }
          await appendMessage(serviceClient, prepared.threadId, {
            role: 'tool',
            content,
            tool_calls: { tool_call_id: tc.id },
          });
          messages.push({
            role: 'tool',
            content,
            tool_call_id: tc.id,
          });
        }
        continue;
      }

      const directText = extractTextContent(result.content).trim();
      if (directText) {
        await emitAssistantText(directText, prepared, serviceClient, send);
        finishTurn();
        return;
      }

      break;
    }
  }

  let finalText = await streamOrFetchText(messages, prepared, send);

  if (!finalText && hadDraftPreview) {
    finalText = draftAck(prepared.locale);
    send('token', { content: finalText });
  }

  if (!finalText && !draftDisplayPrefix) {
    console.warn('[agents] empty model response after tool/stream passes');
    throw new Error('AI returned an empty response');
  }

  const displayText =
    draftDisplayPrefix && finalText
      ? `${draftDisplayPrefix}\n\n${finalText}`
      : draftDisplayPrefix || finalText;

  if (draftAssistantMessageId) {
    await updateAssistantMessageContent(serviceClient, draftAssistantMessageId, displayText);
  } else if (displayText) {
    await persistAssistantText(serviceClient, prepared.threadId, displayText);
  }

  finishTurn();
}
