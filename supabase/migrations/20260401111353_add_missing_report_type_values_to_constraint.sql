/*
  # Add missing report_type values to moderation_reports CHECK constraint

  ## Summary
  The moderation_reports.report_type CHECK constraint was missing two values
  that are actively used in the application:
  - 'level3_content': displayed in the admin moderation UI filter and badge components
  - 'user_report': declared in the TypeScript ReportType union type

  ## Changes
  - **moderation_reports** table:
    - Drops the existing CHECK constraint `moderation_reports_report_type_check`
    - Recreates it with 'level3_content' and 'user_report' added

  ## Notes
  1. No data rows are modified.
  2. Existing valid values are preserved unchanged.
  3. Without this fix, any insert/update using 'level3_content' would fail at the DB level.
*/

ALTER TABLE moderation_reports
  DROP CONSTRAINT IF EXISTS moderation_reports_report_type_check;

ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_report_type_check
  CHECK (report_type = ANY (ARRAY[
    'level1_content'::text,
    'level2_content'::text,
    'level3_content'::text,
    'user_report'::text,
    'living_person'::text,
    'right_to_oblivion'::text,
    'impersonation'::text,
    'copyright'::text,
    'other'::text
  ]));
