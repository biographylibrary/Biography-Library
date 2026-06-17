/*
  # Account status (active / suspended) for profiles

  - `profiles.account_status`: `active` | `suspended` (default `active`)
  - Helpers: `get_my_account_status()`, `profile_account_is_active(uuid)` (SECURITY DEFINER)
  - RLS: biographies anon/authenticated SELECT — public listings and owner access require active author;
         staff unchanged. INSERT/UPDATE/DELETE for owners require active account.
  - `get_biography_by_share_token`: no rows when author is suspended.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Column
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN account_status text NOT NULL DEFAULT 'active'
      CONSTRAINT profiles_account_status_check CHECK (account_status IN ('active', 'suspended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status)
  WHERE account_status <> 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helpers (avoid RLS recursion; same pattern as get_my_role)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_account_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_status FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.profile_account_is_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT account_status = 'active' FROM public.profiles WHERE id = p_user_id LIMIT 1),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Biographies SELECT (anon + authenticated)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read for published biographies" ON public.biographies;

CREATE POLICY "Public read for published biographies"
  ON public.biographies
  FOR SELECT
  TO anon
  USING (
    status = 'published'
    AND visibility = 'public'
    AND public.profile_account_is_active(user_id)
  );

DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
      )
    )
    OR (
      status <> 'removed'
      AND (
        (
          user_id = (SELECT auth.uid())
          AND public.get_my_account_status() = 'active'
        )
        OR (
          visibility = 'public'
          AND public.profile_account_is_active(user_id)
        )
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Biographies INSERT / DELETE (owner must be active)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own biographies" ON public.biographies;

CREATE POLICY "Users can insert own biographies"
  ON public.biographies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND public.get_my_account_status() = 'active'
  );

DROP POLICY IF EXISTS "Users can delete own biographies" ON public.biographies;

CREATE POLICY "Users can delete own biographies"
  ON public.biographies
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND public.get_my_account_status() = 'active'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Biographies UPDATE (frozen + account)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Biographies: owner or admin can update, blocked if frozen" ON public.biographies;

CREATE POLICY "Biographies: owner or admin can update, blocked if frozen"
  ON public.biographies
  FOR UPDATE
  TO authenticated
  USING (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
      AND public.get_my_account_status() = 'active'
    )
    OR public.get_my_role() = ANY (ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
      AND public.get_my_account_status() = 'active'
    )
    OR public.get_my_role() = ANY (ARRAY['admin', 'super_admin'])
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Share-token RPC — hide link-only biographies when author is suspended
-- ─────────────────────────────────────────────────────────────────────────────
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
  INNER JOIN public.profiles p ON p.id = b.user_id AND p.account_status = 'active'
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
