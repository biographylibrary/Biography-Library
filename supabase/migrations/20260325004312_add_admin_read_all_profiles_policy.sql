/*
  # Add admin read-all policy on profiles

  ## Summary
  Adds a SELECT policy on the profiles table so that users with role
  'admin' or 'super_admin' can read all profiles, not just their own.
  This is required by the moderation panel to look up user information.

  ## Changes
  - profiles: new SELECT policy "Admins can read all profiles"

  ## Security
  - Restricted to authenticated users whose own profile has role IN ('admin', 'super_admin')
  - Regular users are unchanged — they can only read their own row
*/

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
        AND p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );
