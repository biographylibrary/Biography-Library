/*
  # Fix infinite recursion in RLS policies

  ## Problem
  The "Admins can read all profiles" policy on `profiles` queries the `profiles`
  table itself to check the user's role. Any policy on another table (e.g.,
  `biographies`) that also queries `profiles` to check roles creates a circular
  dependency → "infinite recursion detected in policy for relation profiles".

  ## Solution
  1. Create a SECURITY DEFINER function `get_my_role()` that reads the current
     user's role from `profiles` bypassing RLS. This breaks the cycle.
  2. Replace every `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
     AND profiles.role IN (...))` check with `get_my_role() IN (...)`.
  3. Fix the self-referential "Admins can read all profiles" policy on `profiles`.

  ## Security
  - `get_my_role()` is SECURITY DEFINER but returns only the caller's own role.
  - All existing access rules are preserved; only the implementation changes.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create a stable SECURITY DEFINER helper that returns the caller's role
--    without triggering RLS on profiles.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix profiles SELECT policies (the root cause of the recursion)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR public.get_my_role() IN ('admin', 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix biographies SELECT policy to use get_my_role()
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('reviewer', 'admin', 'super_admin')
    OR (
      status != 'removed'
      AND (
        user_id = (SELECT auth.uid())
        OR privacy = 'public'
        OR (privacy = 'public' AND share_token IS NOT NULL)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix biographies UPDATE policy to use get_my_role()
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Biographies: owner or admin can update" ON public.biographies;

CREATE POLICY "Biographies: owner or admin can update"
  ON public.biographies FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.get_my_role() IN ('admin', 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Fix moderation_reports SELECT and UPDATE policies to use get_my_role()
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Reporters see own reports; staff see all" ON public.moderation_reports;

CREATE POLICY "Reporters see own reports; staff see all"
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = reporter_id
    OR public.get_my_role() IN ('reviewer', 'admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Staff can update reports" ON public.moderation_reports;

CREATE POLICY "Staff can update reports"
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('reviewer', 'admin', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('reviewer', 'admin', 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fix moderation_messages SELECT policy to use get_my_role()
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Internal messages visible to staff only" ON public.moderation_messages;

CREATE POLICY "Internal messages visible to staff only"
  ON public.moderation_messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN is_internal = true THEN
        public.get_my_role() IN ('reviewer', 'admin', 'super_admin')
      ELSE
        public.get_my_role() IN ('reviewer', 'admin', 'super_admin')
        OR EXISTS (
          SELECT 1
          FROM moderation_reports mr
          JOIN biographies b ON b.id = mr.biography_id
          WHERE mr.id = moderation_messages.report_id
            AND b.user_id = (SELECT auth.uid())
        )
    END
  );
