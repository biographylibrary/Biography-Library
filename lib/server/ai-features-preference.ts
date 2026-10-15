import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';

export type SetAiFeaturesResult =
  | { ok: true; enabled: boolean; purgedBiographyIds: string[] }
  | {
      ok: false;
      error: 'memory_purge_failed';
      enabled: false;
      purgedBiographyIds: string[];
      failedBiographyIds: string[];
    }
  | { ok: false; error: 'profile_update_failed'; message: string };

/**
 * Imposta `profiles.ai_features_enabled`.
 * Se si spegne: prima il flag a false, poi purge della memoria Echo su ogni
 * biografia dell'utente (originali ed edizioni). Se un purge fallisce il flag
 * resta false così l'operazione è ripetibile.
 * Non tocca i thread Echo senza `biography_id` (hub).
 */
export async function setAiFeaturesEnabled(
  serviceClient: SupabaseClient,
  userId: string,
  enabled: boolean
): Promise<SetAiFeaturesResult> {
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ ai_features_enabled: enabled })
    .eq('id', userId);

  if (updateError) {
    return { ok: false, error: 'profile_update_failed', message: updateError.message };
  }

  if (enabled) {
    return { ok: true, enabled: true, purgedBiographyIds: [] };
  }

  const { data: bios, error: listError } = await serviceClient
    .from('biographies')
    .select('id')
    .eq('user_id', userId);

  if (listError) {
    return {
      ok: false,
      error: 'memory_purge_failed',
      enabled: false,
      purgedBiographyIds: [],
      failedBiographyIds: [],
    };
  }

  const ids = (bios ?? []).map((b) => (b as { id: string }).id);
  const purgedBiographyIds: string[] = [];
  const failedBiographyIds: string[] = [];

  for (const biographyId of ids) {
    try {
      await purgeAgentMemoryForBiography(serviceClient, biographyId);
      purgedBiographyIds.push(biographyId);
    } catch {
      failedBiographyIds.push(biographyId);
    }
  }

  if (failedBiographyIds.length > 0) {
    return {
      ok: false,
      error: 'memory_purge_failed',
      enabled: false,
      purgedBiographyIds,
      failedBiographyIds,
    };
  }

  return { ok: true, enabled: false, purgedBiographyIds };
}
