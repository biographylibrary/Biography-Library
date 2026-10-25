/**
 * Select e filtri delle query pubbliche su biographies (ruolo anon).
 * Ogni colonna qui deve essere nel GRANT di
 * 20261025120000_biographies_anon_column_grants.sql.
 */

export const PUBLISHED_SELECT =
  'id, title, subject_name, author_name, record_language_tag, biography_type, chapters_count, published_at, view_count, is_featured, featured_at, slug, listing_cover_url, provisional_until, is_pioneer';

export const PUBLIC_EDITIONS_SELECT =
  'id, slug, title, subject_name, record_language_tag, translation_of';

export const PUBLIC_BIOGRAPHY_FILTER_COLUMNS = [
  'id',
  'slug',
  'status',
  'visibility',
  'translation_of',
  'published_at',
  'featured_at',
  'view_count',
  'is_featured',
] as const;
