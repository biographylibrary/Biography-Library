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
import type { AiUsageContext } from '@/lib/ai/usage-recorder';
import { appendMessage, updateAssistantMessageContent } from '@/lib/agents/thread-service';
import { recoverTextToolCalls } from '@/lib/agents/text-tool-calls';
import { maybeCompressThreadMemory } from '@/lib/agents/thread-memory';
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

/**
 * Scritta dall'app, non dal modello: il modello racconta spesso la modifica come già fatta anche
 * quando lo strumento ha risposto con un errore. Se la proposta non è andata a buon fine l'autore
 * deve leggerlo con certezza.
 */
const DRAFT_NOT_APPLIED: Record<string, string> = {
  en: 'I could not make this change, so your text has not been changed. Tell me in your own words the exact passage to change and I will try again.',
  it: 'Non sono riuscito a fare questa modifica, quindi il tuo testo non è cambiato. Dimmi con parole tue il punto esatto da cambiare e riprovo.',
  fr: 'Je n\'ai pas pu faire cette modification, votre texte n\'a donc pas changé. Indiquez-moi avec vos mots le passage exact à modifier et je réessaie.',
  de: 'Ich konnte diese Änderung nicht vornehmen, Ihr Text wurde deshalb nicht verändert. Nennen Sie mir mit eigenen Worten die genaue Stelle, und ich versuche es erneut.',
};

function draftNotApplied(locale?: string): string {
  const lang = (locale ?? 'en').slice(0, 2);
  return DRAFT_NOT_APPLIED[lang] ?? DRAFT_NOT_APPLIED.en;
}

/** Vero se la risposta dello strumento è un errore (propose_draft risponde `{ "error": ... }`). */
function isToolError(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as { error?: unknown };
    return typeof parsed?.error === 'string' && parsed.error.length > 0;
  } catch {
    return false;
  }
}

function asToolCalls(value: unknown): ToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ToolCall => {
    if (!item || typeof item !== 'object') return false;
    const call = item as ToolCall;
    return typeof call.id === 'string' && call.id.length > 0;
  });
}

/** Drops tool calls that have no matching answer, which makes the model reject the whole turn. */
export function normalizeToolMessages(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (message.role === 'tool') continue;
    if (message.role !== 'assistant' || !message.tool_calls) {
      out.push(message);
      continue;
    }

    const calls = asToolCalls(message.tool_calls);
    const responses: ChatMessage[] = [];
    let next = i + 1;
    while (next < messages.length && messages[next].role === 'tool') {
      responses.push(messages[next]);
      next += 1;
    }
    const answered = new Set(responses.map((row) => row.tool_call_id).filter(Boolean));
    const paired =
      calls.length > 0 &&
      calls.length === responses.length &&
      calls.every((call) => answered.has(call.id));

    if (paired) {
      out.push({ ...message, tool_calls: calls });
      for (const call of calls) {
        const response = responses.find((row) => row.tool_call_id === call.id);
        if (response) out.push(response);
      }
    } else if (message.content.trim()) {
      out.push({ role: 'assistant', content: message.content });
    }
    i = next - 1;
  }
  return out;
}

export function messagesWithoutToolProtocol(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === 'tool') continue;
    if (message.role === 'assistant') {
      if (!message.content.trim()) continue;
      out.push({ role: 'assistant', content: message.content });
      continue;
    }
    out.push(message);
  }
  return out;
}

export function historyToChatMessages(
  rows: { role: string; content: string; tool_calls?: unknown }[]
): ChatMessage[] {
  const mapped = rows
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
  return normalizeToolMessages(mapped);
}

type SendFn = (event: string, data: unknown) => void;

function echoUsage(prepared: PreparedAgentTurn): AiUsageContext {
  return { purpose: 'echo', userId: prepared.userId, biographyId: prepared.biographyId ?? null };
}

async function executeToolCall(
  tc: ToolCall,
  prepared: PreparedAgentTurn,
  serviceClient: SupabaseClient
): Promise<{ content: string; event?: EchoToolResultEvent }> {
  return executeEchoTool(tc.function.name, tc.function.arguments, {
    serviceClient,
    userId: prepared.userId,
    biographyId: prepared.biographyId,
    echoPage: prepared.echoPage,
    biographyMode: prepared.biographyMode,
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
      usage: echoUsage(prepared),
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
    try {
      const result = await chat({
        role: prepared.role,
        usage: echoUsage(prepared),
        messages,
        stream: false,
      });
      fullContent = extractTextContent(result.content);
    } catch (textErr) {
      console.warn('[agents] text pass failed, retrying without tool history:', textErr);
      const result = await chat({
        role: prepared.role,
        usage: echoUsage(prepared),
        messages: messagesWithoutToolProtocol(messages),
        stream: false,
      });
      fullContent = extractTextContent(result.content);
    }
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
  const messages: ChatMessage[] = normalizeToolMessages([
    { role: 'system', content: prepared.systemPrompt },
    ...prepared.history,
    { role: 'user', content: prepared.userMessage },
  ]);

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
  let draftFailed = false;
  let draftAssistantMessageId: string | null = null;
  let draftDisplayPrefix = '';
  /** Se l'ultima proposta di testo è fallita e nessuna è riuscita, l'app lo dichiara. */
  const failureNote = () => (draftFailed && !hadDraftPreview ? draftNotApplied(prepared.locale) : '');

  if (toolsEnabled) {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let result;
      try {
        result = await chat({
          role: prepared.role,
          usage: echoUsage(prepared),
          messages,
          tools: prepared.tools,
          tool_choice: 'auto',
          stream: false,
        });
      } catch (toolErr) {
        console.warn('[agents] tool pass failed, continuing without tools:', toolErr);
        break;
      }

      if (!result.tool_calls?.length) {
        // Il modello può scrivere la chiamata come testo invece di usare `tool_calls`:
        // la si riconosce, altrimenti l'autore legge la riga e non vede la scheda «Inserisci».
        const recovered = recoverTextToolCalls(extractTextContent(result.content), prepared.tools);
        if (recovered.calls.length) {
          console.warn(
            '[agents] tool call written as text, recovered:',
            recovered.calls.map((call) => call.function.name).join(', ')
          );
          result = { ...result, content: recovered.text, tool_calls: recovered.calls };
        }
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
          if (tc.function.name === 'propose_draft' && !event && isToolError(content)) {
            draftFailed = true;
          }
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
        const note = failureNote();
        await emitAssistantText(note ? `${directText}\n\n${note}` : directText, prepared, serviceClient, send);
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

  const note = failureNote();
  if (note) {
    // Si accoda alle parole del modello: quello che ha già scritto resta, ma l'ultima parola è dell'app.
    const hadVisibleText = Boolean(finalText || draftDisplayPrefix);
    send('token', { content: hadVisibleText ? `\n\n${note}` : note });
    finalText = finalText ? `${finalText}\n\n${note}` : note;
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
