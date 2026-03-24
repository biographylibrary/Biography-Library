/*
  # Fix always-true INSERT policy on moderation_reports

  ## Summary
  The "Any authenticated user can file a report" INSERT policy had
  `WITH CHECK (true)`, which effectively bypassed row-level security for
  all authenticated users — allowing them to insert rows with any values,
  including spoofed reporter_id values pointing to other users.

  ## Fix
  Replace the always-true check with a check that enforces:
  - reporter_id must equal the authenticated user's ID

  The anonymous INSERT policy (reporter_id IS NULL) is left unchanged for
  unauthenticated report submissions.
*/

DROP POLICY IF EXISTS "Any authenticated user can file a report" ON public.moderation_reports;

CREATE POLICY "Any authenticated user can file a report"
  ON public.moderation_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));
