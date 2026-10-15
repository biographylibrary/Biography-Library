import type { SupabaseClient } from '@supabase/supabase-js';

export const AI_FEATURES_DISABLED_ERROR = 'ai_features_disabled' as const;

export type AiFeaturesGateResult =
  | { ok: true }
  | { ok: false; status: 403; error: typeof AI_FEATURES_DISABLED_ERROR };

/**
 * Legge `profiles.ai_features_enabled` lato server.
 * Se il flag è falso (o il profilo non si legge), la richiesta IA va rifiutata con 403.
 */
export async function assertAiFeaturesEnabled(
  serviceClient: SupabaseClient,
  userId: string
): Promise<AiFeaturesGateResult> {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('ai_features_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (error || !(data as { ai_features_enabled?: boolean } | null)?.ai_features_enabled) {
    return { ok: false, status: 403, error: AI_FEATURES_DISABLED_ERROR };
  }
  return { ok: true };
}
