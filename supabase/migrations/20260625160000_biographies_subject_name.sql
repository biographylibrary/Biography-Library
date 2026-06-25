/*
  # Memorial protagonist name (subject_name)

  Memorial biographies distinguish the person the story is about (subject_name)
  from the writer (author_name). Autobiographies leave subject_name null.
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS subject_name text;

COMMENT ON COLUMN public.biographies.subject_name IS
  'Full name of the person the memorial biography is about; null for autobiographies.';

UPDATE public.biographies
SET subject_name = title
WHERE biography_type = 'memorial'
  AND (subject_name IS NULL OR btrim(subject_name) = '')
  AND title IS NOT NULL
  AND btrim(title) <> '';

-- Share-token RPC: expose subject_name and biography_type for link-only readers.
DROP FUNCTION IF EXISTS get_biography_by_share_token(uuid, text);

CREATE OR REPLACE FUNCTION get_biography_by_share_token(
  p_biography_id uuid,
  p_token        text
)
RETURNS TABLE (
  id                  uuid,
  title               text,
  author_name         text,
  subject_name        text,
  biography_type      text,
  content             jsonb,
  visibility          text,
  status              text,
  share_token         text,
  created_at          timestamptz,
  published_at        timestamptz,
  is_frozen           boolean,
  frozen_at           timestamptz,
  listing_cover_url   text,
  section_name        text,
  section_created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.author_name,
    b.subject_name,
    b.biography_type::text,
    b.content,
    b.visibility,
    b.status,
    b.share_token,
    b.created_at,
    b.published_at,
    b.is_frozen,
    b.frozen_at,
    b.listing_cover_url,
    s.section_name,
    s.created_at AS section_created_at
  FROM public.biographies b
  LEFT JOIN public.biography_sections s
    ON s.biography_id = b.id
  WHERE b.id          = p_biography_id
    AND b.visibility  = 'link-only'
    AND b.share_token IS NOT NULL
    AND b.share_token = p_token
  ORDER BY s.created_at ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION get_biography_by_share_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_biography_by_share_token(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_biography_by_share_token(uuid, text) TO authenticated;
