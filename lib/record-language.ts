/**
 * Lingua del contenuto della scheda (BCP 47).
 * Preferisce `record_language_tag`; fallback a `content_language` durante la transizione.
 */

export function resolveRecordLanguageTag(
  row: {
    record_language_tag?: string | null;
    content_language?: string | null;
  } | null | undefined,
  fallback = 'en'
): string {
  const tag = row?.record_language_tag?.trim() || row?.content_language?.trim();
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
