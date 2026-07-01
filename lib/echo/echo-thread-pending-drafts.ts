import type { AgentMessageRow } from '@/lib/agents/thread-service';

type ToolDraftPayload = {
  ok?: boolean;
  preview?: boolean;
  sectionKey?: string;
  draftText?: string;
};

function parseToolDraft(content: string): ToolDraftPayload | null {
  try {
    const parsed = JSON.parse(content) as ToolDraftPayload;
    if (parsed.preview && parsed.sectionKey && parsed.draftText) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function isProposeDraftToolCall(toolCalls: unknown): boolean {
  if (!Array.isArray(toolCalls)) return false;
  return toolCalls.some((tc) => {
    const fn = (tc as { function?: { name?: string } })?.function;
    return fn?.name === 'propose_draft';
  });
}

export type MessageWithPendingDraft = {
  id: string;
  role: string;
  content: string;
  pendingDraft?: { sectionKey: string; draftText: string };
};

export function enrichMessagesWithPendingDrafts(
  allRows: AgentMessageRow[]
): MessageWithPendingDraft[] {
  const draftByAssistantId = new Map<string, { sectionKey: string; draftText: string }>();

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row.role !== 'assistant' || !isProposeDraftToolCall(row.tool_calls)) continue;

    for (let j = i + 1; j < allRows.length && j <= i + 3; j++) {
      const toolRow = allRows[j];
      if (toolRow.role !== 'tool') continue;
      const draft = parseToolDraft(toolRow.content);
      if (draft?.sectionKey && draft.draftText) {
        draftByAssistantId.set(row.id, {
          sectionKey: draft.sectionKey,
          draftText: draft.draftText,
        });
        break;
      }
    }
  }

  return allRows
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const pending = m.role === 'assistant' ? draftByAssistantId.get(m.id) : undefined;
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        ...(pending ? { pendingDraft: pending } : {}),
      };
    });
}

/** Only the most recent assistant draft should surface as actionable in the UI. */
export function retainOnlyLatestPendingDraft<T extends MessageWithPendingDraft>(
  messages: T[]
): T[] {
  let latestIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].pendingDraft) {
      latestIndex = i;
      break;
    }
  }
  if (latestIndex < 0) return messages;
  return messages.map((m, i) =>
    i !== latestIndex && m.pendingDraft ? { ...m, pendingDraft: undefined } : m
  );
}
