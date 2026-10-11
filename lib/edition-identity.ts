/**
 * Identificativo UM da scrivere nelle uscite di un'edizione: quello dell'originale.
 * Per gli originali i caller usano il um_id già letto dalla riga; questa funzione
 * serve alle edizioni. Distingue errore di lettura da identificativo assente.
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

export type EditionIdentityResult = {
  /** Identificativo da scrivere; null se assente (non se la lettura è fallita). */
  umId: string | null;
  /** True se una lettura necessaria è fallita (errore di rete/DB o eccezione). */
  failed: boolean;
  /** True se la scheda è un'edizione (`translation_of` valorizzato). */
  isEdition: boolean;
};

function umOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Per un'edizione: um_id dell'originale.
 * Per un originale: um_id della riga (i caller permanenza dovrebbero comunque
 * preferire il valore già letto sulla riga).
 */
export async function resolveEditionIdentity(
  client: EditionIdentityClient,
  biographyId: string
): Promise<EditionIdentityResult> {
  try {
    const { data, error } = await client
      .from('biographies')
      .select('um_id, translation_of')
      .eq('id', biographyId)
      .maybeSingle();
    if (error) return { umId: null, failed: true, isEdition: false };
    if (!data) return { umId: null, failed: false, isEdition: false };

    const row = data as { um_id?: string | null; translation_of?: string | null };
    const translationOf = row.translation_of;
    if (typeof translationOf === 'string' && translationOf.length > 0) {
      const { data: original, error: originalError } = await client
        .from('biographies')
        .select('um_id')
        .eq('id', translationOf)
        .maybeSingle();
      if (originalError) return { umId: null, failed: true, isEdition: true };
      if (!original) return { umId: null, failed: true, isEdition: true };
      return {
        umId: umOrNull((original as { um_id?: string | null }).um_id),
        failed: false,
        isEdition: true,
      };
    }

    return { umId: umOrNull(row.um_id), failed: false, isEdition: false };
  } catch {
    return { umId: null, failed: true, isEdition: false };
  }
}
