import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Delete agent threads, messages, memory facts, and RAG chunks when a biography is published.
 * Idempotent — safe to call multiple times.
 */
export async function purgeAgentMemoryForBiography(
  serviceClient: SupabaseClient,
  biographyId: string
): Promise<void> {
  const { data: threads } = await serviceClient
    .from('agent_threads')
    .select('id')
    .eq('biography_id', biographyId)
    .in('agent_type', ['biography_coach', 'publication_reviewer']);

  const threadIds = (threads ?? []).map((t) => (t as { id: string }).id);

  if (threadIds.length > 0) {
    await serviceClient.from('agent_threads').delete().in('id', threadIds);
  }

  await serviceClient.from('biography_chunks').delete().eq('biography_id', biographyId);
}
