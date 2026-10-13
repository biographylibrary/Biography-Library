import {
  buildEditionAlternates,
  siteOrigin,
  type EditionAlternateRow,
} from '@/lib/edition-alternates';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loose Supabase-like client. Real `@supabase/supabase-js` is cast at the call site;
 * unit tests pass a fake chain.
 */
export type EditionMetadataClient = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

export type EditionViewAlternates = {
  canonical: string;
  languages?: Record<string, string>;
};

type LookupBuilder = {
  eq: (column: string, value: string) => {
    maybeSingle: () => Promise<{ data: EditionAlternateRow | null }>;
  };
};

type GroupBuilder = {
  or: (filter: string) => {
    eq: (column: string, value: string) => {
      eq: (
        column: string,
        value: string
      ) => PromiseLike<{ data: EditionAlternateRow[] | null }>;
    };
  };
};

/**
 * Resolves canonical + hreflang for a public view route id (UUID or slug).
 * Uses only the anon client; returns null when the row is missing or not public.
 */
export async function resolveEditionViewAlternates(
  client: EditionMetadataClient,
  routeId: string,
  origin = siteOrigin()
): Promise<EditionViewAlternates | null> {
  const selectCols = 'id, slug, translation_of, record_language_tag, status, visibility';

  let row: EditionAlternateRow | null = null;
  if (UUID_RE.test(routeId)) {
    const lookup = client.from('biographies').select(selectCols) as LookupBuilder;
    const { data } = await lookup.eq('id', routeId).maybeSingle();
    row = data;
  } else {
    const lookup = client.from('biographies').select(selectCols) as LookupBuilder;
    const { data } = await lookup.eq('slug', routeId).maybeSingle();
    row = data;
  }

  if (!row || row.status !== 'published' || row.visibility !== 'public') {
    return null;
  }

  const current = row;
  const root = current.translation_of || current.id;
  const groupQuery = client.from('biographies').select(selectCols) as GroupBuilder;
  const { data: group } = await groupQuery
    .or(`id.eq.${root},translation_of.eq.${root}`)
    .eq('status', 'published')
    .eq('visibility', 'public');

  const rows = (group ?? []).slice();
  if (!rows.some((r) => r.id === current.id)) {
    rows.push(current);
  }

  return buildEditionAlternates({
    rows,
    origin,
    currentId: current.id,
  });
}
