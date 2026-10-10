/**
 * Lingue già occupate da originale ed edizioni (tag canonici).
 * Il modulo di creazione offre solo le altre.
 */
export function occupiedLanguageTags(input: {
  originalTag: string | null | undefined;
  editionTags: readonly (string | null | undefined)[];
}): Set<string> {
  const out = new Set<string>();
  const add = (tag: string | null | undefined) => {
    const t = tag?.trim();
    if (t) out.add(t);
  };
  add(input.originalTag);
  for (const tag of input.editionTags) add(tag);
  return out;
}

export function availableLanguageBases(
  allBases: readonly string[],
  occupied: Set<string>
): string[] {
  const occupiedBases = new Set(
    Array.from(occupied).map((tag) => tag.split('-')[0]!.toLowerCase())
  );
  return allBases.filter((base) => !occupiedBases.has(base.toLowerCase()));
}
