/**
 * Unione delle edizioni pubbliche per originale (catalogo).
 * Usata per applicare elenco e edizioni nello stesso aggiornamento di stato.
 */

export type CatalogEditionRow = {
  id: string;
  translation_of: string;
};

export function mergeEditionsByOriginal<T extends CatalogEditionRow>(
  prev: Record<string, T[]>,
  rows: T[]
): Record<string, T[]> {
  const next: Record<string, T[]> = { ...prev };
  for (const row of rows) {
    const key = row.translation_of;
    if (!next[key]) next[key] = [];
    if (!next[key]!.some((e) => e.id === row.id)) {
      next[key] = [...next[key]!, row];
    }
  }
  return next;
}
