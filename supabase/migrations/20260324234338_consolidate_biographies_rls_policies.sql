/*
  # Consolidate biographies RLS policies

  ## Summary
  Merges the three overlapping SELECT policies on biographies into one,
  and merges the two UPDATE policies into one, eliminating the
  "Multiple Permissive Policies" security warnings.

  ## Changes

  ### SELECT consolidation
  Removes:
    - "Users can read own biographies"
    - "Authenticated users can view public biographies"
    - "Public biographies accessible via share token"
  Replaces with:
    - "Biographies: owner or public access" — covers all three cases in one policy

  ### UPDATE consolidation
  Removes:
    - "Users can update own biographies"
    - "Admins can freeze biographies"
  Replaces with:
    - "Biographies: owner or admin can update" — owner may update their own rows;
      admins/super_admins may update any row
*/

-- ============================================================
-- Consolidate SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "Users can read own biographies" ON public.biographies;
DROP POLICY IF EXISTS "Authenticated users can view public biographies" ON public.biographies;
DROP POLICY IF EXISTS "Public biographies accessible via share token" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies FOR SELECT
  TO authenticated
  USING (
    (user_id = (select auth.uid()))
    OR (privacy = 'public')
    OR ((privacy = 'public') AND (share_token IS NOT NULL))
  );

-- ============================================================
-- Consolidate UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Users can update own biographies" ON public.biographies;
DROP POLICY IF EXISTS "Admins can freeze biographies" ON public.biographies;

CREATE POLICY "Biographies: owner or admin can update"
  ON public.biographies FOR UPDATE
  TO authenticated
  USING (
    (user_id = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
  WITH CHECK (
    (user_id = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );
