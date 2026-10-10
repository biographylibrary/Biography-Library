import type { AnyClient } from '@/lib/server/service-client';
import { editionTextMatchesOriginal } from '@/lib/edition-text-compare';

/**
 * Un'edizione si pubblica solo se l'originale è già published.
 * La policy di lettura è la seconda difesa: qui si ferma la rotta.
 */
export function editionMayPublish(input: {
  translationOf: string | null | undefined;
  originalStatus: string | null | undefined;
}): boolean {
  if (!input.translationOf) return true;
  return input.originalStatus === 'published';
}

export const ORIGINAL_NOT_PUBLISHED_ERROR = 'original_not_published';

export const ORIGINAL_NOT_PUBLISHED_MESSAGE =
  'La traduzione si invia quando l\'originale è pubblicato.';

export const TRANSLATION_IDENTICAL_ERROR = 'translation_identical_to_original';

export const TRANSLATION_IDENTICAL_MESSAGE =
  'Il testo è identico all\'originale: scrivi la traduzione prima di inviarla.';

type BodyRow = {
  translation_of?: string | null;
  content?: Record<string, unknown> | null;
  content_freeflow?: string | null;
  narrative_order?: string[] | null;
  final_version?: string | null;
  status?: string | null;
};

/** Null se si può proseguire. Altrimenti l'edizione non va bloccata né messa in coda. */
export async function editionOriginalBlock(
  client: AnyClient,
  biographyId: string
): Promise<{ error: string; message: string } | null> {
  const { data: bio, error } = await client
    .from('biographies')
    .select('translation_of')
    .eq('id', biographyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const translationOf = (bio as { translation_of?: string | null } | null)?.translation_of ?? null;
  if (!translationOf) return null;

  const { data: original, error: originalError } = await client
    .from('biographies')
    .select('status')
    .eq('id', translationOf)
    .maybeSingle();
  if (originalError) throw new Error(originalError.message);
  if (editionMayPublish({
    translationOf,
    originalStatus: (original as { status?: string } | null)?.status ?? null,
  })) {
    return null;
  }
  return { error: ORIGINAL_NOT_PUBLISHED_ERROR, message: ORIGINAL_NOT_PUBLISHED_MESSAGE };
}

/**
 * Se l'edizione ha ancora il testo dell'originale (NFC, spazi collassati),
 * non può avanzare. Accanto a editionOriginalBlock.
 */
export async function editionIdenticalBlock(
  client: AnyClient,
  biographyId: string
): Promise<{ error: string; message: string } | null> {
  const { data: bio, error } = await client
    .from('biographies')
    .select('translation_of, content, content_freeflow, narrative_order, final_version')
    .eq('id', biographyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = bio as BodyRow | null;
  const translationOf = row?.translation_of ?? null;
  if (!translationOf) return null;

  const { data: original, error: originalError } = await client
    .from('biographies')
    .select('content, content_freeflow, narrative_order, final_version')
    .eq('id', translationOf)
    .maybeSingle();
  if (originalError) throw new Error(originalError.message);
  if (!original) return null;

  if (
    !editionTextMatchesOriginal(
      (row ?? {}) as Parameters<typeof editionTextMatchesOriginal>[0],
      original as Parameters<typeof editionTextMatchesOriginal>[0]
    )
  ) {
    return null;
  }
  return { error: TRANSLATION_IDENTICAL_ERROR, message: TRANSLATION_IDENTICAL_MESSAGE };
}
