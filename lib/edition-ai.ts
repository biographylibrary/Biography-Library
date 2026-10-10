/**
 * Strumenti di scrittura con IA (controllo grammaticale, Echo) sulle edizioni.
 * Una scheda è edizione quando `translation_of` è valorizzato.
 */

export function isEditionBiography(
  translationOf: string | null | undefined
): boolean {
  return typeof translationOf === 'string' && translationOf.length > 0;
}

/** False sulle edizioni: né grammatica né Echo sul testo. */
export function aiWritingToolsAvailableForBiography(opts: {
  translationOf?: string | null;
}): boolean {
  return !isEditionBiography(opts.translationOf);
}
