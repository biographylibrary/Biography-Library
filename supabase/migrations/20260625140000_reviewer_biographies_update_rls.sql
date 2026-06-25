-- Allow reviewers to update biographies for moderation and publication review workflows.
-- Admins/super_admins already had staff UPDATE; reviewers were blocked despite admin UI access.

DROP POLICY IF EXISTS "Biographies: owner or admin can update, blocked if frozen" ON public.biographies;

CREATE POLICY "Biographies: owner or staff can update, blocked if frozen"
  ON public.biographies
  FOR UPDATE
  TO authenticated
  USING (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
      AND public.get_my_account_status() = 'active'
    )
    OR public.get_my_role() = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
  )
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
      AND public.get_my_account_status() = 'active'
    )
    OR public.get_my_role() = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
  );
