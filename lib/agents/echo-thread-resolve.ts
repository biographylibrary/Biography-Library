import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentThreadRow } from '@/lib/agents/thread-service';
import { echoStorageTypesForLookup, LEGACY_ECHO_STORAGE_TYPE } from './echo-thread-storage';

async function countThreadMessages(
  serviceClient: SupabaseClient,
  threadId: string,
): Promise<number> {
  const { count, error } = await serviceClient
    .from('agent_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId);

  if (error) throw error;
  return count ?? 0;
}

async function refreshThreadMessageCount(
  serviceClient: SupabaseClient,
  threadId: string,
): Promise<void> {
  const count = await countThreadMessages(serviceClient, threadId);
  await serviceClient
    .from('agent_threads')
    .update({
      message_count: count,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', threadId);
}

async function mergeEchoThreadInto(
  serviceClient: SupabaseClient,
  winnerId: string,
  loserId: string,
): Promise<void> {
  const { error: moveError } = await serviceClient
    .from('agent_messages')
    .update({ thread_id: winnerId })
    .eq('thread_id', loserId);

  if (moveError) throw moveError;

  const { error: deleteError } = await serviceClient
    .from('agent_threads')
    .delete()
    .eq('id', loserId);

  if (deleteError) throw deleteError;

  await refreshThreadMessageCount(serviceClient, winnerId);
}

async function promoteThreadToEcho(
  serviceClient: SupabaseClient,
  thread: AgentThreadRow,
): Promise<AgentThreadRow> {
  if (thread.agent_type === 'echo') return thread;

  const { data, error } = await serviceClient
    .from('agent_threads')
    .update({ agent_type: 'echo' })
    .eq('id', thread.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as AgentThreadRow;
}

/**
 * Echo history lived on `platform_guide` threads before the `echo` agent type existed.
 * Opening Echo can create a new empty `echo` thread; without consolidation the UI
 * binds to the empty thread and legacy messages appear lost.
 */
export async function resolveEchoActiveThread(
  serviceClient: SupabaseClient,
  params: { userId: string; biographyId?: string | null },
): Promise<AgentThreadRow | null> {
  const { userId, biographyId = null } = params;

  let query = serviceClient
    .from('agent_threads')
    .select('*')
    .eq('user_id', userId)
    .in('agent_type', echoStorageTypesForLookup())
    .eq('status', 'active');

  if (biographyId) {
    query = query.eq('biography_id', biographyId);
  } else {
    query = query.is('biography_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const threads = (data ?? []) as AgentThreadRow[];
  if (threads.length === 0) return null;
  if (threads.length === 1) {
    return promoteThreadToEcho(serviceClient, threads[0]);
  }

  const withCounts = await Promise.all(
    threads.map(async (thread) => ({
      thread,
      count: Math.max(thread.message_count ?? 0, await countThreadMessages(serviceClient, thread.id)),
    })),
  );

  withCounts.sort((a, b) => b.count - a.count);
  let winner = withCounts[0].thread;

  for (const { thread: loser, count } of withCounts.slice(1)) {
    if (count === 0) {
      await serviceClient.from('agent_threads').delete().eq('id', loser.id);
      continue;
    }
    await mergeEchoThreadInto(serviceClient, winner.id, loser.id);
    const refreshed = await serviceClient
      .from('agent_threads')
      .select('*')
      .eq('id', winner.id)
      .maybeSingle();
    if (refreshed.data) winner = refreshed.data as AgentThreadRow;
  }

  return promoteThreadToEcho(serviceClient, winner);
}

export function isLegacyEchoStorageType(agentType: string): boolean {
  return agentType === LEGACY_ECHO_STORAGE_TYPE;
}
