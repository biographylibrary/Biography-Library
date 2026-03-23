/*
  # Create biography_media table

  ## Summary
  Creates a table for storing photo/media metadata linked to biographies,
  backed by files in the biography-photos storage bucket.

  ## New Tables

  ### biography_media
  - `id` (uuid, PK) — unique record identifier
  - `biography_id` (uuid, FK → biographies) — owning biography; cascades on delete
  - `user_id` (uuid, FK → profiles) — owning user; cascades on delete
  - `file_url` (text, NOT NULL) — full URL to the file in storage
  - `file_name` (text, nullable) — original filename
  - `caption` (text, nullable, default '') — optional caption text
  - `layout` (text, NOT NULL, default 'full-page') — one of: full-page, cover,
    two-vertical, two-horizontal, three-mixed
  - `display_order` (integer, default 0) — sort order within a biography
  - `created_at` (timestamptz, default now())

  ## Constraints
  - `layout` is restricted to the five allowed values via CHECK constraint
  - A trigger enforces a maximum of 10 biography_media rows per biography_id

  ## Security
  - RLS enabled; four separate policies (SELECT, INSERT, UPDATE, DELETE)
  - All policies restrict access to rows where user_id = auth.uid()
  - No public access
*/

CREATE TABLE IF NOT EXISTS biography_media (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id   uuid        NOT NULL REFERENCES biographies(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url       text        NOT NULL,
  file_name      text,
  caption        text        DEFAULT '',
  layout         text        NOT NULL DEFAULT 'full-page',
  display_order  integer     DEFAULT 0,
  created_at     timestamptz DEFAULT now(),

  CONSTRAINT biography_media_layout_check
    CHECK (layout IN ('full-page', 'cover', 'two-vertical', 'two-horizontal', 'three-mixed'))
);

CREATE OR REPLACE FUNCTION check_biography_media_limit()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM biography_media
    WHERE biography_id = NEW.biography_id
  ) >= 10 THEN
    RAISE EXCEPTION 'A biography may have at most 10 media items.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_biography_media_limit
  BEFORE INSERT ON biography_media
  FOR EACH ROW EXECUTE FUNCTION check_biography_media_limit();

ALTER TABLE biography_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON biography_media
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON biography_media
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON biography_media
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON biography_media
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
