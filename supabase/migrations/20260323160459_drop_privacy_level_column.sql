/*
  # Drop redundant privacy_level column from biographies

  ## Summary
  The biographies table has two overlapping columns with the same default ('private'):
    - privacy        — canonical column, referenced throughout the codebase
    - privacy_level  — redundant duplicate, now safe to remove

  Two RLS SELECT policies referenced privacy_level. They are dropped and
  recreated using the canonical privacy column before the column is removed.

  ## Changes
  1. DROP policy "Authenticated users can view public biographies"
  2. DROP policy "Public biographies accessible via share token"
  3. DROP COLUMN privacy_level
  4. Recreate both policies using the privacy column

  ## Security
  Policy logic is preserved exactly — only the column name changes.
*/

DROP POLICY IF EXISTS "Authenticated users can view public biographies" ON biographies;
DROP POLICY IF EXISTS "Public biographies accessible via share token" ON biographies;

ALTER TABLE biographies DROP COLUMN IF EXISTS privacy_level;

CREATE POLICY "Authenticated users can view public biographies"
  ON biographies
  FOR SELECT
  TO authenticated
  USING ((privacy = 'public') OR (user_id = auth.uid()));

CREATE POLICY "Public biographies accessible via share token"
  ON biographies
  FOR SELECT
  TO authenticated
  USING ((privacy = 'public') AND (share_token IS NOT NULL));
