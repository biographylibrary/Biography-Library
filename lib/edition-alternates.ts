export type EditionAlternateRow = {
  id: string;
  slug: string | null;
  record_language_tag: string | null;
  translation_of: string | null;
  status?: string | null;
  visibility?: string | null;
};

export function siteOrigin(envUrl?: string | null): string {
  const raw = (envUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (!raw) return 'https://app.biographylibrary.org';
  return raw.replace(/\/+$/, '');
}

function versionPath(row: Pick<EditionAlternateRow, 'id' | 'slug'>): string {
  return `/biography/${row.slug || row.id}/view`;
}

/**
 * Builds Next.js Metadata.alternates for a public biography view.
 * Re-filters unpublished / non-public / untagged rows. Pure — no Next/Supabase.
 */
export function buildEditionAlternates(params: {
  rows: EditionAlternateRow[];
  origin: string;
  currentId: string;
}): { canonical: string; languages?: Record<string, string> } | null {
  const origin = params.origin.replace(/\/+$/, '');
  const publicRows = params.rows.filter(
    (row) =>
      row.status === 'published' &&
      row.visibility === 'public' &&
      !!row.record_language_tag?.trim()
  );

  const current =
    publicRows.find((r) => r.id === params.currentId) ??
    params.rows.find((r) => r.id === params.currentId);
  if (!current) return null;

  const canonical = `${origin}${versionPath(current)}`;

  if (publicRows.length < 2) {
    return { canonical };
  }

  const languages: Record<string, string> = {};
  let originalUrl: string | null = null;
  for (const row of publicRows) {
    const tag = row.record_language_tag!.trim();
    const url = `${origin}${versionPath(row)}`;
    languages[tag] = url;
    if (!row.translation_of) {
      originalUrl = url;
    }
  }
  if (originalUrl) {
    languages['x-default'] = originalUrl;
  }

  return { canonical, languages };
}
