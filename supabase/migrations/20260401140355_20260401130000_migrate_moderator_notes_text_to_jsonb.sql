/*
  # Migrate moderator_notes column from text to jsonb

  ## Summary
  Changes the `moderator_notes` column in `moderation_reports` from `text` to `jsonb`.

  ## Changes
  - `moderation_reports.moderator_notes`: text → jsonb
    - Existing text values are cast to jsonb using `::jsonb`
    - NULL values remain NULL
    - Any non-JSON text values would fail the cast; assumes all existing data is valid JSON or NULL

  ## Reason
  The Supabase JS client returns jsonb columns as already-parsed objects, eliminating the need
  for manual JSON.parse() in application code and reducing the risk of parse errors.
*/

ALTER TABLE moderation_reports
  ALTER COLUMN moderator_notes TYPE jsonb
  USING CASE
    WHEN moderator_notes IS NULL THEN NULL
    ELSE moderator_notes::jsonb
  END;
