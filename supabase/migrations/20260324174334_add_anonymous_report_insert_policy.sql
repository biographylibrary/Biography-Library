/*
  # Allow anonymous users to file moderation reports

  ## Summary
  Adds an INSERT policy on moderation_reports for unauthenticated (anon) users,
  so that visitors who are not logged in can still submit a report.
  The existing authenticated INSERT policy is left in place.

  ## Changes
  - New INSERT policy on moderation_reports for the `anon` role
    - reporter_id must be NULL (since they have no auth.uid())

  ## Security
  - Unauthenticated reporters cannot set a reporter_id; it must be NULL.
  - All other column constraints (report_type CHECK, status default) still apply.
*/

CREATE POLICY "Anonymous users can file a report without reporter_id"
  ON moderation_reports FOR INSERT
  TO anon
  WITH CHECK (reporter_id IS NULL);
