import { supabase } from '@/lib/supabase';

export type CatalogLanguage = 'en' | 'it' | 'fr' | 'de';

const CATALOG_LANGUAGES = new Set<string>(['en', 'it', 'fr', 'de']);

export function isCatalogLanguage(value: string): value is CatalogLanguage {
  return CATALOG_LANGUAGES.has(value);
}

/** Distinct target languages per published biography (from cached reader translations). */
export async function fetchPublishedTranslationLocales(): Promise<Record<string, CatalogLanguage[]>> {
  const { data, error } = await supabase
    .from('biography_view_translations')
    .select('biography_id, target_language');

  if (error || !data) return {};

  const map = new Map<string, Set<CatalogLanguage>>();
  for (const row of data) {
    const biographyId = (row as { biography_id?: string }).biography_id;
    const target = (row as { target_language?: string }).target_language;
    if (!biographyId || !target || !isCatalogLanguage(target)) continue;
    if (!map.has(biographyId)) map.set(biographyId, new Set());
    map.get(biographyId)!.add(target);
  }

  return Object.fromEntries(
    Array.from(map.entries()).map(([id, langs]) => [id, Array.from(langs).sort()])
  ) as Record<string, CatalogLanguage[]>;
}

export function biographyMatchesLanguageFilter(
  contentLanguage: string | null | undefined,
  translationLanguages: CatalogLanguage[] | undefined,
  filter: string
): boolean {
  if (filter === 'all') return true;
  const original = contentLanguage || 'en';
  if (original === filter) return true;
  return (translationLanguages ?? []).includes(filter as CatalogLanguage);
}
