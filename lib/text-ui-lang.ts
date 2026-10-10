import type { UiLang } from '@/lib/person-events';

/**
 * Lingua di interfaccia (en/it/fr/de) dalla prima parte del tag BCP 47 del testo.
 * Qualunque altra cosa diventa en. Usata da permanence, parti del libro, ecc.
 */
export function uiLangFromTag(tag: string | null | undefined): UiLang {
  const base = (tag ?? 'en').split('-')[0]?.toLowerCase();
  if (base === 'it' || base === 'fr' || base === 'de') return base;
  return 'en';
}
