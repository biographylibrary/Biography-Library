/*
  # Block updates on frozen biographies for non-admin users

  ## Summary
  Replaces the existing UPDATE policy on the biographies table to add a freeze
  check. Previously, any biography owner could update their biography regardless
  of its frozen state. This migration ensures that when a biography has
  is_frozen = true, only admins and super_admins can perform updates.

  ## Changes
  - **biographies** table (UPDATE policy replaced):
    - Old: "Biographies: owner or admin can update"
      Allowed owner OR admin to update — no freeze check.
    - New: "Biographies: owner or admin can update, blocked if frozen"
      Owner may update ONLY when is_frozen = false.
      Admin/super_admin may update regardless of frozen state.

  ## Security
  - Non-admin users who own a frozen biography will have their UPDATE statements
    rejected at the RLS layer.
  - Admins retain full UPDATE access to frozen and unfrozen biographies.
  - USING and WITH CHECK are symmetric to prevent bypass via partial row reads.

  ## Notes
  1. `get_my_role()` is an existing SECURITY DEFINER function that returns the
     caller's role from public.profiles — safe to use in policies.
  2. The old policy is dropped first; the new policy is created in its place.
  3. No data is modified — this is a policy-only change.
*/

DROP POLICY IF EXISTS "Biographies: owner or admin can update" ON biographies;

CREATE POLICY "Biographies: owner or admin can update, blocked if frozen"
  ON biographies
  FOR UPDATE
  TO authenticated
  USING (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
    )
    OR get_my_role() = ANY (ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND NOT is_frozen
    )
    OR get_my_role() = ANY (ARRAY['admin', 'super_admin'])
  );
