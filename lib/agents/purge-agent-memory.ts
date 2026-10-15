import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Alla pubblicazione (la prima e ogni pubblicazione successiva) si cancella la
 * memoria di Echo di quella biografia: thread, messaggi, fatti di memoria e
 * frammenti indicizzati (`biography_chunks`). Le righe di `ai_token_usage`
 * restano: non contengono testo.
 *
 * Va chiamata dalle rotte server che pubblicano, solo dopo che la scrittura dello
 * stato `published` è riuscita. Idempotente: si può richiamare senza danni.
 * Lancia se una cancellazione fallisce, così il chiamante lo registra invece di
 * credere la memoria cancellata.
 *
 * Non tocca il thread generale di Echo dell'utente (quello senza biografia):
 * per quello usare `purgeAgentMemoryForUserHub`.
 */
export async function purgeAgentMemoryForBiography(
  serviceClient: SupabaseClient,
  biographyId: string
): Promise<void> {
  const { data: threads, error: listError } = await serviceClient
    .from('agent_threads')
    .select('id')
    .eq('biography_id', biographyId);
  if (listError) throw listError;

  await deleteThreadsWithMemory(serviceClient, (threads ?? []).map((t) => (t as { id: string }).id));

  const { error: chunksError } = await serviceClient
    .from('biography_chunks')
    .delete()
    .eq('biography_id', biographyId);
  if (chunksError) throw chunksError;
}

/**
 * Cancella i thread Echo hub dell'utente (`biography_id` null) con messaggi,
 * riassunti (sui thread) e note (`agent_memory_facts`). Non tocca `ai_token_usage`.
 */
export async function purgeAgentMemoryForUserHub(
  serviceClient: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: threads, error: listError } = await serviceClient
    .from('agent_threads')
    .select('id')
    .eq('user_id', userId)
    .is('biography_id', null);
  if (listError) throw listError;

  await deleteThreadsWithMemory(serviceClient, (threads ?? []).map((t) => (t as { id: string }).id));
}

async function deleteThreadsWithMemory(
  serviceClient: SupabaseClient,
  threadIds: string[]
): Promise<void> {
  if (threadIds.length === 0) return;

  const { error: factsError } = await serviceClient
    .from('agent_memory_facts')
    .delete()
    .in('thread_id', threadIds);
  if (factsError) throw factsError;

  const { error: messagesError } = await serviceClient
    .from('agent_messages')
    .delete()
    .in('thread_id', threadIds);
  if (messagesError) throw messagesError;

  const { error: threadsError } = await serviceClient
    .from('agent_threads')
    .delete()
    .in('id', threadIds);
  if (threadsError) throw threadsError;
}
