import {
  canonicalizeTextLanguage,
  textLanguageLabels,
  textLanguageOptionLabel,
} from '@/lib/text-languages';

export type WorkVersion = {
  id: string;
  slug: string | null;
  title: string;
  subjectName: string | null;
  /** Canonical record_language_tag. */
  tag: string;
  isOriginal: boolean;
};

function normalizeSearch(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

function versionContainsSearch(
  version: WorkVersion,
  needle: string,
  fields: Array<'title' | 'subjectName'>
): boolean {
  for (const field of fields) {
    const value = field === 'title' ? version.title : version.subjectName ?? '';
    if (normalizeSearch(value).includes(needle)) return true;
  }
  return false;
}

export function languageBase(tag: string): string {
  const canonical = canonicalizeTextLanguage(tag) ?? tag.trim();
  return canonical.split('-')[0]?.toLowerCase() ?? '';
}

export function buildWorkVersions(
  original: {
    id: string;
    slug?: string | null;
    title: string;
    subjectName?: string | null;
    tag: string;
  },
  editions: Array<{
    id: string;
    slug?: string | null;
    title: string;
    subjectName?: string | null;
    tag?: string | null;
  }>
): WorkVersion[] {
  const versions: WorkVersion[] = [
    {
      id: original.id,
      slug: original.slug ?? null,
      title: original.title,
      subjectName: original.subjectName ?? null,
      tag: original.tag,
      isOriginal: true,
    },
  ];

  const seenTags = new Set<string>([original.tag]);
  const withTag = editions
    .filter((e) => {
      const tag = e.tag?.trim();
      return !!tag;
    })
    .map((e) => ({
      id: e.id,
      slug: e.slug ?? null,
      title: e.title,
      subjectName: e.subjectName ?? null,
      tag: e.tag!.trim(),
      isOriginal: false as const,
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  for (const edition of withTag) {
    if (seenTags.has(edition.tag)) continue;
    seenTags.add(edition.tag);
    versions.push(edition);
  }

  return versions;
}

export function versionMatchesLanguage(version: WorkVersion, filterBase: string): boolean {
  if (!filterBase) return true;
  return languageBase(version.tag) === filterBase.toLowerCase();
}

export function workMatchesLanguage(
  versions: WorkVersion[],
  filterBase: string
): boolean {
  if (!filterBase || filterBase === 'all') return true;
  return versions.some((v) => versionMatchesLanguage(v, filterBase));
}

export function workMatchesSearch(params: {
  versions: WorkVersion[];
  authorName: string;
  searchText: string;
}): boolean {
  const needle = normalizeSearch(params.searchText.trim());
  if (!needle) return true;
  if (normalizeSearch(params.authorName).includes(needle)) return true;
  return params.versions.some((v) => versionContainsSearch(v, needle, ['title', 'subjectName']));
}

export function pickDisplayVersion(params: {
  versions: WorkVersion[];
  languageFilter: string | null | undefined;
  searchText: string;
  authorName?: string;
}): WorkVersion {
  const { versions, languageFilter, searchText, authorName = '' } = params;
  const original = versions.find((v) => v.isOriginal) ?? versions[0];
  if (!original) {
    throw new Error('pickDisplayVersion: empty versions');
  }

  const filter = languageFilter && languageFilter !== 'all' ? languageFilter : null;
  if (filter) {
    const match = versions.find((v) => versionMatchesLanguage(v, filter));
    return match ?? original;
  }

  const needle = normalizeSearch(searchText.trim());
  if (needle) {
    const originalMatches =
      versionContainsSearch(original, needle, ['title', 'subjectName']) ||
      normalizeSearch(authorName).includes(needle);
    if (!originalMatches) {
      const editionHits = versions.filter(
        (v) => !v.isOriginal && versionContainsSearch(v, needle, ['title', 'subjectName'])
      );
      if (editionHits.length === 1) return editionHits[0]!;
    }
  }

  return original;
}

export function languageOptions(
  tags: readonly string[],
  uiLanguage: string
): Array<{ value: string; label: string }> {
  const bases = new Map<string, string>();
  for (const raw of tags) {
    const canonical = canonicalizeTextLanguage(raw);
    if (!canonical) continue;
    const base = languageBase(canonical);
    if (!base || bases.has(base)) continue;
    bases.set(base, base);
  }

  const options = Array.from(bases.values()).map((base) => ({
    value: base,
    label: textLanguageOptionLabel(base, uiLanguage),
  }));

  options.sort((a, b) => {
    const nameA = textLanguageLabels(a.value, uiLanguage).inUi;
    const nameB = textLanguageLabels(b.value, uiLanguage).inUi;
    return nameA.localeCompare(nameB, uiLanguage);
  });

  return options;
}
