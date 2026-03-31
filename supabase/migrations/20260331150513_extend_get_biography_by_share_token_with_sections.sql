/*
  # Extend get_biography_by_share_token to include section timestamps

  ## Purpose
  The view page needs section timestamps (section_name, created_at) to order
  and date-stamp sections for display. Previously this was fetched via a direct
  anon SELECT on biography_sections, which required a broad anon RLS policy that
  did not enforce token proof.

  By including section timestamps in the SECURITY DEFINER RPC result, we ensure:
  - Token proof is enforced before any section data is returned
  - Anonymous users cannot access section rows by UUID alone
  - The view page gets everything it needs from a single already-secure call

  ## Changes
  Replaces get_biography_by_share_token(uuid, text) with a new version that
  returns one row per biography_section, with the biography columns repeated.
  The client deduplicates biography metadata and builds a sections map from the
  section_name / section_created_at columns.

  Note: biography_sections rows are LEFT JOINed so the RPC returns the biography
  even if it has no sections yet.

  ## Security
  Same SECURITY DEFINER guarantees as before:
  - visibility must be 'link-only'
  - share_token must not be null
  - share_token must match p_token exactly
  - status is intentionally not checked (any status is accessible with token)
  - private biographies excluded by visibility check
*/

DROP FUNCTION IF EXISTS get_biography_by_share_token(uuid, text);

CREATE OR REPLACE FUNCTION get_biography_by_share_token(
  p_biography_id uuid,
  p_token        text
)
RETURNS TABLE (
  id                  uuid,
  title               text,
  author_name         text,
  content             jsonb,
  visibility          text,
  status              text,
  share_token         text,
  created_at          timestamptz,
  published_at        timestamptz,
  is_frozen           boolean,
  frozen_at           timestamptz,
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
    b.content,
    b.visibility,
    b.status,
    b.share_token,
    b.created_at,
    b.published_at,
    b.is_frozen,
    b.frozen_at,
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
