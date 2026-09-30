import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Delete RAG chunks when a biography is published.
 * Idempotent — safe to call multiple times.
 *
 * (Le conversazioni dei tipi di agente tolti, biography_coach e publication_reviewer,
 * non esistono più; i thread di Echo non venivano eliminati da questa funzione
 * e continuano a non esserlo.)
 */
export async function purgeAgentMemoryForBiography(
  serviceClient: SupabaseClient,
  biographyId: string
): Promise<void> {
  await serviceClient.from('biography_chunks').delete().eq('biography_id', biographyId);
}
