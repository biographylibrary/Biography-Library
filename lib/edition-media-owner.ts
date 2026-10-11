/**
 * Proprietario delle foto (copertina e galleria): l'originale per le edizioni.
 * Usabile da browser e server (nessun import server-only).
 */

type MaybeSingleResult = {
  data: unknown;
  error: unknown;
};

type SelectEqMaybe = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => PromiseLike<MaybeSingleResult>;
    };
  };
};

export type MediaOwnerClient = {
  from: (table: string) => SelectEqMaybe;
};

/** Restituisce `translation_of` se edizione, altrimenti l'id. Se la riga manca o la lettura fallisce, restituisce l'id senza lanciare. */
export async function resolveMediaOwnerId(
  client: MediaOwnerClient,
  biographyId: string
): Promise<string> {
  try {
    const { data, error } = await client
      .from('biographies')
      .select('translation_of')
      .eq('id', biographyId)
      .maybeSingle();
    if (error || !data) return biographyId;
    const translationOf = (data as { translation_of?: string | null }).translation_of;
    if (typeof translationOf === 'string' && translationOf.length > 0) {
      return translationOf;
    }
    return biographyId;
  } catch {
    return biographyId;
  }
}
