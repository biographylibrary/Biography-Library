/**
 * Lingua del testo della scheda (BCP 47): solo `record_language_tag`.
 */

export function resolveRecordLanguageTag(
  row: {
    record_language_tag?: string | null;
  } | null | undefined,
  fallback = 'en'
): string {
  const tag = row?.record_language_tag?.trim();
  return tag || fallback;
}

/** Base language for the four UI locales (en/it/fr/de). */
export function recordLanguageUiBase(
  tag: string | null | undefined
): 'en' | 'it' | 'fr' | 'de' {
  const base = (tag ?? 'en').split('-')[0]?.toLowerCase();
  if (base === 'it' || base === 'fr' || base === 'de') return base;
  return 'en';
}
