/**
 * Coniazione server-side degli identificativi UM.
 * Unicità dal registro `um_identifiers`, non dalla probabilità.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { mintUmIdNow, normalizeUmId, toCanonical } from '@/lib/um-id';
import { umYearFromDate } from '@/lib/um';

type AnyClient = SupabaseClient<any, any, any>;

const MAX_ATTEMPTS = 8;

export type MintResult = {
  umIdNormalized: string;
  umIdCanonical: string;
  umYear: number;
};

/**
 * Genera un UM id, lo inserisce nel registro e lo assegna alla biografia.
 * In caso di collisione (23505) ritenta.
 */
export async function mintUmIdFor(
  service: AnyClient,
  biographyId: string,
  now: Date = new Date()
): Promise<MintResult> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const canonical = mintUmIdNow(now);
    const normalized = normalizeUmId(canonical);
    const year = umYearFromDate(now);

    const { error: regError } = await service.from('um_identifiers').insert({
      um_id: normalized,
      um_year: year,
      issued_at: now.toISOString(),
      biography_id: biographyId,
    });

    if (regError) {
      // Unique violation → retry
      if (regError.code === '23505') {
        lastError = regError.message;
        continue;
      }
      throw new Error(`um_identifiers insert failed: ${regError.message}`);
    }

    const { error: bioError } = await service
      .from('biographies')
      .update({ um_id: normalized })
      .eq('id', biographyId)
      .is('um_id', null);

    if (bioError) {
      // Roll back registry row so we don't leave an orphan issued id without bio link
      // (id stays reserved forever if we keep it — preferred: keep registry, biography may be repaired)
      throw new Error(`biographies um_id update failed: ${bioError.message}`);
    }

    return {
      umIdNormalized: normalized,
      umIdCanonical: toCanonical(normalized),
      umYear: year,
    };
  }

  throw new Error(
    `Failed to mint unique UM id after ${MAX_ATTEMPTS} attempts: ${lastError ?? 'unknown'}`
  );
}

/** Se la scheda non ha ancora um_id, lo conia. Idempotente. */
export async function ensureUmIdFor(
  service: AnyClient,
  biographyId: string
): Promise<MintResult> {
  const { data, error } = await service
    .from('biographies')
    .select('um_id')
    .eq('id', biographyId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data?.um_id) {
    return {
      umIdNormalized: data.um_id as string,
      umIdCanonical: toCanonical(data.um_id as string),
      umYear: 0, // not needed by callers of ensure
    };
  }

  return mintUmIdFor(service, biographyId);
}
