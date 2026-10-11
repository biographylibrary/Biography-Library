/**
 * Identificativo UM da scrivere nelle uscite di un'edizione: quello dell'originale.
 * Per gli originali: il proprio. Nessuna scrittura nel database.
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

export type EditionIdentityClient = {
  from: (table: string) => SelectEqMaybe;
};

/** `um_id` da mettere in intestazione/colofone/export. Null se assente (come oggi). */
export async function resolveEditionIdentity(
  client: EditionIdentityClient,
  biographyId: string
): Promise<string | null> {
  try {
    const { data, error } = await client
      .from('biographies')
      .select('um_id, translation_of')
      .eq('id', biographyId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { um_id?: string | null; translation_of?: string | null };
    const translationOf = row.translation_of;
    if (typeof translationOf === 'string' && translationOf.length > 0) {
      const { data: original, error: originalError } = await client
        .from('biographies')
        .select('um_id')
        .eq('id', translationOf)
        .maybeSingle();
      if (originalError || !original) return null;
      const um = (original as { um_id?: string | null }).um_id;
      return typeof um === 'string' && um.trim() ? um : null;
    }
    const own = row.um_id;
    return typeof own === 'string' && own.trim() ? own : null;
  } catch {
    return null;
  }
}
