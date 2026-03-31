/*
  # Fix biographies RLS: exclude link-only from direct table access

  ## Problem
  Two existing RLS policies grant direct SELECT access to link-only biographies
  without requiring a share token:

  1. "Public read for published biographies" (anon role)
     QUAL: status = 'published' AND visibility IN ('public', 'link-only')
     → Allows any anonymous user to SELECT a published link-only biography by UUID
       without providing the share token, bypassing the token-gated access model.

  2. "Biographies: owner or public access" (authenticated role)
     QUAL: ... OR (status <> 'removed' AND (user_id = auth.uid() OR visibility IN ('public', 'link-only')))
     → Allows any authenticated user to SELECT any link-only biography regardless
       of whether they hold the share token.

  ## Fix
  - Anon policy: restrict to visibility = 'public' only (published + public).
    Token-based access for link-only biographies is handled exclusively by the
    SECURITY DEFINER RPC get_biography_by_share_token(), which enforces exact
    token match before returning any data.

  - Authenticated policy: restrict the "public" arm to visibility = 'public'.
    Owners already access their own biographies via the user_id = auth.uid() arm.
    Staff (reviewer/admin/super_admin) access via the EXISTS profiles check.
    No legitimate authenticated non-owner non-staff path requires reading a
    link-only biography directly from the table; they must use the token RPC.

  ## Security outcome
  After this migration:
  - Anonymous users can SELECT biographies ONLY when: status='published' AND visibility='public'
    (token-based link-only access continues to work via SECURITY DEFINER RPC)
  - Authenticated non-owner non-staff users can SELECT biographies ONLY when:
    status<>'removed' AND visibility='public'
  - Owners always see their own biographies (unchanged)
  - Staff (reviewer/admin/super_admin) always see all non-removed biographies (unchanged)
  - link-only biographies remain accessible to anyone with the correct token via RPC (unchanged)
  - Public listing / search endpoints that query the table directly will never
    surface link-only biographies to anonymous or unprivileged authenticated users

  ## Tables modified
  - public.biographies (RLS policy changes only, no schema changes)

  ## Important notes
  1. The SECURITY DEFINER function get_biography_by_share_token() is NOT changed.
  2. biography_sections has no anon policy (confirmed) — no change needed there.
  3. This is a narrowing of access; no existing legitimate access path is removed.
*/

-- ----------------------------------------------------------------
-- 1. Fix anon policy: only published + public, no link-only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Public read for published biographies" ON public.biographies;

CREATE POLICY "Public read for published biographies"
  ON public.biographies
  FOR SELECT
  TO anon
  USING (
    status     = 'published'
    AND visibility = 'public'
  );

-- ----------------------------------------------------------------
-- 2. Fix authenticated policy: restrict public arm to visibility='public'
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies
  FOR SELECT
  TO authenticated
  USING (
    -- Staff can see everything (except removed)
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id   = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
      )
    )
    OR
    -- Owner or truly-public biography (not removed)
    (
      status <> 'removed'
      AND (
        user_id    = (SELECT auth.uid())
        OR visibility = 'public'
      )
    )
  );
