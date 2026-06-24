import { SupabaseClient } from '@supabase/supabase-js';
import { chat } from '@/lib/agents/infomaniak-client';
import {
  AGENT_COMPRESS_AFTER_MESSAGES,
  AGENT_CONTEXT_MESSAGE_LIMIT,
  AGENT_KEEP_RECENT_RAW,
  AGENT_SUMMARY_MAX_CHARS,
} from '@/lib/agents/agent-limits';
import type { AgentMessageRow, AgentThreadRow } from '@/lib/agents/thread-service';
import {
  loadAllThreadMessages,
  loadRecentThreadMessages,
} from '@/lib/agents/thread-service';
import { historyToChatMessages } from '@/lib/agents/run-agent-turn';
import type { ChatMessage } from '@/lib/agents/infomaniak-client';
import {
  filterToolNoise,
  formatAgentMemoryBlock,
  parseCompressionResponse,
  splitMessagesForCompression,
  type ThreadMemoryFacts,
} from '@/lib/agents/thread-memory-format';

export type { ThreadMemoryFacts } from '@/lib/agents/thread-memory-format';
export {
  filterToolNoise,
  formatAgentMemoryBlock,
  parseCompressionResponse,
  splitMessagesForCompression,
} from '@/lib/agents/thread-memory-format';

const FACT_TYPES = ['session_state', 'people', 'preferences', 'open_threads', 'decisions'] as const;
const COMPRESSION_META_TYPE = 'compression_meta';

const compressingThreads = new Set<string>();

export async function loadThreadMemoryFacts(
  serviceClient: SupabaseClient,
  threadId: string
): Promise<ThreadMemoryFacts> {
  const { data, error } = await serviceClient
    .from('agent_memory_facts')
    .select('fact_type, fact_json')
    .eq('thread_id', threadId)
    .in('fact_type', [...FACT_TYPES]);

  if (error) throw error;

  const facts: ThreadMemoryFacts = {};
  for (const row of data ?? []) {
    const type = (row as { fact_type: string }).fact_type;
    const json = (row as { fact_json: Record<string, unknown> }).fact_json;
    if (type === 'session_state') {
      facts.currentFocus = json as ThreadMemoryFacts['currentFocus'];
    } else if (type === 'people') {
      facts.people = (json.people as ThreadMemoryFacts['people']) ?? [];
    } else if (type === 'preferences') {
      facts.preferences = json as ThreadMemoryFacts['preferences'];
    } else if (type === 'open_threads') {
      facts.openThreads = (json.items as string[]) ?? [];
    } else if (type === 'decisions') {
      facts.decisions = (json.items as string[]) ?? [];
    }
  }
  return facts;
}

type CompressionMeta = {
  messageCountAtCompress: number;
  compressedAt: string;
};

async function loadCompressionMeta(
  serviceClient: SupabaseClient,
  threadId: string
): Promise<CompressionMeta | null> {
  const { data } = await serviceClient
    .from('agent_memory_facts')
    .select('fact_json')
    .eq('thread_id', threadId)
    .eq('fact_type', COMPRESSION_META_TYPE)
    .maybeSingle();

  if (!data) return null;
  const json = (data as { fact_json: CompressionMeta }).fact_json;
  return json?.messageCountAtCompress != null ? json : null;
}

async function saveCompressionMeta(
  serviceClient: SupabaseClient,
  threadId: string,
  messageCount: number
): Promise<void> {
  const meta: CompressionMeta = {
    messageCountAtCompress: messageCount,
    compressedAt: new Date().toISOString(),
  };

  const { data: existing } = await serviceClient
    .from('agent_memory_facts')
    .select('id')
    .eq('thread_id', threadId)
    .eq('fact_type', COMPRESSION_META_TYPE)
    .maybeSingle();

  if (existing) {
    await serviceClient
      .from('agent_memory_facts')
      .update({ fact_json: meta })
      .eq('id', (existing as { id: string }).id);
  } else {
    await serviceClient.from('agent_memory_facts').insert({
      thread_id: threadId,
      fact_type: COMPRESSION_META_TYPE,
      fact_json: meta,
    });
  }
}

async function upsertFact(
  serviceClient: SupabaseClient,
  threadId: string,
  factType: string,
  factJson: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await serviceClient
    .from('agent_memory_facts')
    .select('id')
    .eq('thread_id', threadId)
    .eq('fact_type', factType)
    .maybeSingle();

  if (existing) {
    await serviceClient
      .from('agent_memory_facts')
      .update({ fact_json: factJson })
      .eq('id', (existing as { id: string }).id);
  } else {
    await serviceClient.from('agent_memory_facts').insert({
      thread_id: threadId,
      fact_type: factType,
      fact_json: factJson,
    });
  }
}

async function saveThreadMemoryFacts(
  serviceClient: SupabaseClient,
  threadId: string,
  facts: ThreadMemoryFacts
): Promise<void> {
  if (facts.currentFocus && (facts.currentFocus.sectionKey || facts.currentFocus.topic)) {
    await upsertFact(serviceClient, threadId, 'session_state', facts.currentFocus);
  }
  if (facts.people?.length) {
    await upsertFact(serviceClient, threadId, 'people', { people: facts.people });
  }
  if (facts.preferences && (facts.preferences.tone || facts.preferences.language)) {
    await upsertFact(serviceClient, threadId, 'preferences', facts.preferences);
  }
  if (facts.openThreads?.length) {
    await upsertFact(serviceClient, threadId, 'open_threads', { items: facts.openThreads });
  }
  if (facts.decisions?.length) {
    await upsertFact(serviceClient, threadId, 'decisions', { items: facts.decisions });
  }
}

function formatMessagesForCompression(rows: AgentMessageRow[]): string {
  return rows
    .map((row) => {
      const role = row.role.toUpperCase();
      const content = row.content.trim();
      if (!content && row.role === 'assistant' && row.tool_calls) {
        return `${role}: [tool call]`;
      }
      return `${role}: ${content}`;
    })
    .join('\n');
}

async function compressThreadMessages(
  serviceClient: SupabaseClient,
  thread: AgentThreadRow,
  toCompress: AgentMessageRow[],
  existingFacts: ThreadMemoryFacts
): Promise<{ summary: string; facts: ThreadMemoryFacts } | null> {
  const locale = thread.locale || 'en';
  const messageBlock = formatMessagesForCompression(toCompress);
  const existingSummary = thread.rolling_summary?.trim() ?? '';

  const systemPrompt = `You maintain rolling memory for a biography-writing assistant chat.
Respond with JSON only, no markdown fences:
{
  "summary": "updated narrative summary in ${locale}, max ${AGENT_SUMMARY_MAX_CHARS} characters",
  "facts": {
    "currentFocus": { "sectionKey": "optional section key", "topic": "optional topic" },
    "people": [{ "name": "...", "relation": "..." }],
    "preferences": { "tone": "...", "language": "..." },
    "openThreads": ["unfinished topics"],
    "decisions": ["user choices or rejections"]
  }
}
Merge new information with existing memory. Keep still-relevant people and open threads. Drop resolved open threads.`;

  const userContent = [
    existingSummary ? `Previous summary:\n${existingSummary}` : 'Previous summary: (none)',
    `Existing structured facts:\n${JSON.stringify(existingFacts)}`,
    `New messages to incorporate:\n${messageBlock}`,
  ].join('\n\n');

  const result = await chat({
    role: 'onboarding',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 768,
    temperature: 0.2,
    stream: false,
  });

  return parseCompressionResponse(result.content ?? '', AGENT_SUMMARY_MAX_CHARS);
}

export async function buildAgentContext(
  serviceClient: SupabaseClient,
  thread: AgentThreadRow
): Promise<{ history: ChatMessage[]; memoryBlock: string }> {
  const [recentRows, facts] = await Promise.all([
    loadRecentThreadMessages(serviceClient, thread.id, AGENT_CONTEXT_MESSAGE_LIMIT),
    loadThreadMemoryFacts(serviceClient, thread.id),
  ]);

  const filtered = filterToolNoise(recentRows);
  const memoryBlock = formatAgentMemoryBlock(thread.rolling_summary, facts);
  const history = historyToChatMessages(filtered);

  return { history, memoryBlock };
}

export async function maybeCompressThreadMemory(
  serviceClient: SupabaseClient,
  threadId: string
): Promise<void> {
  if (compressingThreads.has(threadId)) return;
  compressingThreads.add(threadId);

  try {
    const { data: thread, error: threadError } = await serviceClient
      .from('agent_threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();

    if (threadError || !thread) return;

    const threadRow = thread as AgentThreadRow;
    const messageCount = threadRow.message_count ?? 0;
    const meta = await loadCompressionMeta(serviceClient, threadId);
    const sinceLastCompress = messageCount - (meta?.messageCountAtCompress ?? 0);

    if (sinceLastCompress < AGENT_COMPRESS_AFTER_MESSAGES) return;

    const allRows = await loadAllThreadMessages(serviceClient, threadId);
    const { toCompress } = splitMessagesForCompression(allRows, AGENT_KEEP_RECENT_RAW);
    if (!toCompress.length) return;

    const existingFacts = await loadThreadMemoryFacts(serviceClient, threadId);
    const compressed = await compressThreadMessages(
      serviceClient,
      threadRow,
      toCompress as AgentMessageRow[],
      existingFacts
    );
    if (!compressed) return;

    await serviceClient
      .from('agent_threads')
      .update({ rolling_summary: compressed.summary })
      .eq('id', threadId);

    await saveThreadMemoryFacts(serviceClient, threadId, compressed.facts);
    await saveCompressionMeta(serviceClient, threadId, messageCount);
  } finally {
    compressingThreads.delete(threadId);
  }
}
