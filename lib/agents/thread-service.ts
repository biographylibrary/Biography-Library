import { SupabaseClient } from '@supabase/supabase-js';
import type { AgentType } from './models';
import {
  buildBiographyNarrativeContext,
  type BiographyNarrativeContext,
} from '@/lib/biography-narrative-context';
import { threadAgentTypeForStorage, echoStorageTypesForLookup } from './echo-thread-storage';
import {
  AGENT_CONTEXT_MESSAGE_LIMIT,
  AGENT_UI_MESSAGE_LIMIT,
} from './agent-limits';

export type AgentThreadRow = {
  id: string;
  user_id: string;
  biography_id: string | null;
  agent_type: AgentType;
  locale: string;
  status: string;
  rolling_summary: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
};

export type AgentMessageRow = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls: unknown;
  created_at: string;
};

const DAILY_LIMIT = parseInt(process.env.AGENT_DAILY_LIMIT ?? '80', 10);
const BURST_LIMIT = parseInt(process.env.AGENT_BURST_LIMIT ?? '10', 10);
const BURST_WINDOW_MS = 60_000;

const burstBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkAgentRateLimit(
  serviceClient: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: 'daily' | 'burst' }> {
  const now = Date.now();
  const burst = burstBuckets.get(userId);
  if (!burst || now >= burst.resetAt) {
    burstBuckets.set(userId, { count: 1, resetAt: now + BURST_WINDOW_MS });
  } else {
    burst.count += 1;
    if (burst.count > BURST_LIMIT) {
      return { allowed: false, reason: 'burst' };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await serviceClient
    .from('agent_usage')
    .select('turn_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const turnCount = (usage as { turn_count?: number } | null)?.turn_count ?? 0;
  if (turnCount >= DAILY_LIMIT) {
    return { allowed: false, reason: 'daily' };
  }

  await serviceClient.from('agent_usage').upsert(
    {
      user_id: userId,
      usage_date: today,
      turn_count: turnCount + 1,
    },
    { onConflict: 'user_id,usage_date' }
  );

  return { allowed: true };
}

export async function getOrCreateThread(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    agentType: AgentType;
    biographyId?: string | null;
    locale?: string;
  }
): Promise<AgentThreadRow> {
  const { userId, agentType, biographyId = null, locale = 'en' } = params;

  if (agentType === 'echo') {
    for (const storageType of echoStorageTypesForLookup()) {
      let query = serviceClient
        .from('agent_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_type', storageType)
        .eq('status', 'active');

      if (biographyId) {
        query = query.eq('biography_id', biographyId);
      } else {
        query = query.is('biography_id', null);
      }

      const { data: existing } = await query.maybeSingle();
      if (existing) return existing as AgentThreadRow;
    }
  } else {
    const storedAgentType = threadAgentTypeForStorage(agentType);

    let query = serviceClient
      .from('agent_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', storedAgentType)
      .eq('status', 'active');

    if (biographyId) {
      query = query.eq('biography_id', biographyId);
    } else {
      query = query.is('biography_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) return existing as AgentThreadRow;
  }

  const storedAgentType = threadAgentTypeForStorage(agentType);

  const { data: created, error } = await serviceClient
    .from('agent_threads')
    .insert({
      user_id: userId,
      biography_id: biographyId,
      agent_type: storedAgentType,
      locale,
    })
    .select('*')
    .single();

  if (error) {
    let retryQuery = serviceClient
      .from('agent_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', storedAgentType)
      .eq('status', 'active');

    if (biographyId) {
      retryQuery = retryQuery.eq('biography_id', biographyId);
    } else {
      retryQuery = retryQuery.is('biography_id', null);
    }

    const { data: retry } = await retryQuery.maybeSingle();
    if (retry) return retry as AgentThreadRow;
    throw error;
  }
  return created as AgentThreadRow;
}

export async function loadRecentThreadMessages(
  serviceClient: SupabaseClient,
  threadId: string,
  limit = AGENT_CONTEXT_MESSAGE_LIMIT
): Promise<AgentMessageRow[]> {
  const { data, error } = await serviceClient
    .from('agent_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as AgentMessageRow[]).reverse();
}

/** @deprecated Use loadRecentThreadMessages — kept for callers passing explicit limits */
export async function loadThreadMessages(
  serviceClient: SupabaseClient,
  threadId: string,
  limit = AGENT_CONTEXT_MESSAGE_LIMIT
): Promise<AgentMessageRow[]> {
  return loadRecentThreadMessages(serviceClient, threadId, limit);
}

export async function loadThreadMessagesBefore(
  serviceClient: SupabaseClient,
  threadId: string,
  before: string,
  limit = 50
): Promise<AgentMessageRow[]> {
  const { data, error } = await serviceClient
    .from('agent_messages')
    .select('*')
    .eq('thread_id', threadId)
    .lt('created_at', before)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as AgentMessageRow[]).reverse();
}

export async function loadAllThreadMessages(
  serviceClient: SupabaseClient,
  threadId: string
): Promise<AgentMessageRow[]> {
  const pageSize = 500;
  const all: AgentMessageRow[] = [];
  let before: string | undefined;

  while (true) {
    let query = serviceClient
      .from('agent_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data ?? []) as AgentMessageRow[];
    if (!batch.length) break;

    all.unshift(...batch.reverse());
    if (batch.length < pageSize) break;
    before = batch[batch.length - 1].created_at;
  }

  return all;
}

export function getAgentUiMessageLimit(): number {
  return AGENT_UI_MESSAGE_LIMIT;
}

export async function appendMessage(
  serviceClient: SupabaseClient,
  threadId: string,
  message: Pick<AgentMessageRow, 'role' | 'content' | 'tool_calls'>
): Promise<AgentMessageRow> {
  const { data, error } = await serviceClient
    .from('agent_messages')
    .insert({
      thread_id: threadId,
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  const { count } = await serviceClient
    .from('agent_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId);

  await serviceClient
    .from('agent_threads')
    .update({
      message_count: count ?? 0,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', threadId);

  return data as AgentMessageRow;
}

export async function verifyThreadOwnership(
  serviceClient: SupabaseClient,
  threadId: string,
  userId: string
): Promise<AgentThreadRow | null> {
  const { data } = await serviceClient
    .from('agent_threads')
    .select('*')
    .eq('id', threadId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as AgentThreadRow | null) ?? null;
}

export async function getActiveThread(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    agentType: AgentType;
    biographyId?: string | null;
  }
): Promise<AgentThreadRow | null> {
  const { userId, agentType, biographyId = null } = params;

  if (agentType === 'echo') {
    for (const storageType of echoStorageTypesForLookup()) {
      let query = serviceClient
        .from('agent_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_type', storageType)
        .eq('status', 'active');

      if (biographyId) {
        query = query.eq('biography_id', biographyId);
      } else {
        query = query.is('biography_id', null);
      }

      const { data } = await query.maybeSingle();
      if (data) return data as AgentThreadRow;
    }
    return null;
  }

  const storedAgentType = threadAgentTypeForStorage(agentType);

  let query = serviceClient
    .from('agent_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('agent_type', storedAgentType)
    .eq('status', 'active');

  if (biographyId) {
    query = query.eq('biography_id', biographyId);
  } else {
    query = query.is('biography_id', null);
  }

  const { data } = await query.maybeSingle();
  return (data as AgentThreadRow | null) ?? null;
}

export async function verifyBiographyOwnership(
  serviceClient: SupabaseClient,
  biographyId: string,
  userId: string
): Promise<{
  ok: boolean;
  biography_mode?: string;
  status?: string;
  narrative?: BiographyNarrativeContext;
}> {
  const { data } = await serviceClient
    .from('biographies')
    .select('user_id, biography_mode, status, biography_type, subject_name, title, author_name')
    .eq('id', biographyId)
    .maybeSingle();

  if (!data) return { ok: false };
  if ((data as { user_id?: string }).user_id !== userId) return { ok: false };
  return {
    ok: true,
    biography_mode: (data as { biography_mode?: string }).biography_mode,
    status: (data as { status?: string }).status,
    narrative: buildBiographyNarrativeContext(data as Parameters<typeof buildBiographyNarrativeContext>[0]),
  };
}
