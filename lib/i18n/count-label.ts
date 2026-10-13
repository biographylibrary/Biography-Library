import type { Language } from '@/lib/i18n/translations';

/** Picks singular/plural via Intl.PluralRules (e.g. French 0 → one). */
export function countLabel(
  language: Language,
  count: number,
  one: string,
  other: string
): string {
  const form = new Intl.PluralRules(language).select(count);
  const template = form === 'one' ? one : other;
  return template.replace('{count}', String(count));
}
