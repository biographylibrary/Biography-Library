/*
  # original_version_at sulle edizioni

  Data di versione dell'originale (COALESCE(revised_at, published_at)) a cui
  la traduzione è stata allineata l'ultima volta. Solo sulle edizioni; riservata
  al server. Non entra in biography_flat.
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS original_version_at timestamptz;

COMMENT ON COLUMN public.biographies.original_version_at IS
  'Data di versione dell''originale (COALESCE(revised_at, published_at)) a cui questa traduzione è stata allineata l''ultima volta. Valorizzata solo sulle edizioni. Lo scrive solo il server.';

CREATE OR REPLACE FUNCTION public.biographies_server_owned_columns()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY[
    'id', 'user_id', 'created_at', 'schema_version',
    'ai_screening_status',
    'published_at', 'published_at_iso', 'published_um_year',
    'provisional_until', 'revised_at',
    'reviewed_by', 'reviewed_at',
    'final_pdf_approved_at', 'final_pdf_url', 'listing_cover_url',
    'export_txt_url', 'export_docx_url',
    'pdf_draft_iteration', 'pdf_draft_started_at', 'pdf_draft_reminder_sent_at',
    'draft_ai_feedback',
    'is_frozen', 'frozen_at', 'frozen_reason',
    'is_featured', 'featured_at', 'featured_by',
    'view_count',
    'chapters_count', 'last_chapter_published_at', 'next_chapter_available_at',
    'chapter_available_email_sent_at',
    'is_pioneer', 'um_id',
    'translation_of',
    'original_version_at'
  ]::text[];
$$;
