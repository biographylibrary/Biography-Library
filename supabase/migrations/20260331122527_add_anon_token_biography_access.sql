/*
  # Anonymous token-based access for link-only biographies

  ## Summary
  Enables anonymous (unauthenticated) users to read a link-only biography that is
  in any status (including draft or under_review) when they supply the exact
  share_token value. This mirrors "unlisted YouTube link" behaviour.

  ## Approach
  Rather than broadening the anon RLS SELECT policy to cover all link-only rows
  (which would expose every link-only draft to anyone), we use a SECURITY DEFINER
  function that accepts (biography_id, token) and returns the biography row ONLY
  when ALL of the following are true:
    - visibility = 'link-only'
    - share_token IS NOT NULL
    - share_token = the supplied token (exact match, case-sensitive)
  The function is accessible to the 'anon' role via GRANT EXECUTE.

  ## What does NOT change
  - The base anon SELECT policy for published public/link-only biographies is
    unchanged: status = 'published' AND visibility IN ('public','link-only').
  - Authenticated-user policies are untouched.
  - Private biographies are never returned by this function.
  - The /biographies listing queries are unaffected (they still require
    status = 'published' AND visibility = 'public').

  ## New objects
  - Function: get_biography_by_share_token(p_biography_id uuid, p_token text)
    Returns: TABLE with the same columns used by the view page.
    Security: SECURITY DEFINER so it can bypass RLS on biographies for the
    narrow token-match check, then re-enforces the token constraint explicitly.

  ## Security notes
  - Token matching is done inside the definer function; the token never appears
    in a user-visible error path.
  - The function returns 0 rows (not an error) for wrong/missing tokens,
    preventing token-enumeration timing differences.
  - REVOKE ALL then GRANT EXECUTE to 'anon' ensures only this path is exposed.
*/

-- Drop if exists so migration is idempotent
DROP FUNCTION IF EXISTS get_biography_by_share_token(uuid, text);

CREATE OR REPLACE FUNCTION get_biography_by_share_token(
  p_biography_id uuid,
  p_token        text
)
RETURNS TABLE (
  id           uuid,
  title        text,
  author_name  text,
  content      jsonb,
  visibility   text,
  status       text,
  share_token  text,
  created_at   timestamptz,
  published_at timestamptz,
  is_frozen    boolean,
  frozen_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return exactly one matching row only when:
  --   1. visibility is 'link-only'
  --   2. share_token is not null
  --   3. share_token matches the supplied token exactly
  -- Status is intentionally NOT checked here — that is the feature.
  -- Private biographies are excluded by the visibility check.
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
    b.frozen_at
  FROM public.biographies b
  WHERE b.id          = p_biography_id
    AND b.visibility  = 'link-only'
    AND b.share_token IS NOT NULL
    AND b.share_token = p_token;
END;
$$;

-- Revoke all privileges first (clean slate)
REVOKE ALL ON FUNCTION get_biography_by_share_token(uuid, text) FROM PUBLIC;

-- Grant execute to anon (unauthenticated Supabase requests) and authenticated
GRANT EXECUTE ON FUNCTION get_biography_by_share_token(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_biography_by_share_token(uuid, text) TO authenticated;
