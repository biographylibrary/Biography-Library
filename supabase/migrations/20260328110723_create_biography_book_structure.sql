/*
  # Create biography_book_structure table

  ## Summary
  Adds a new table to store front matter and back matter content for biography books,
  along with visibility toggles for each section.

  ## New Table: biography_book_structure

  ### Columns
  - `id` — UUID primary key, auto-generated
  - `biography_id` — Foreign key to biographies (cascade delete, unique: one row per biography)
  - `user_id` — Foreign key to profiles (cascade delete)

  ### Front Matter
  - `dedication_content` — Short centered dedication text
  - `epigraph_content` — Quote text for epigraph
  - `epigraph_source` — Attribution for the epigraph quote
  - `preface_content` — Long rich text (JSON/HTML) for preface

  ### Back Matter
  - `epilogue_content` — Long rich text (JSON/HTML) for epilogue
  - `acknowledgements_content` — Medium rich text (JSON/HTML) for acknowledgements
  - `specific_credits_content` — Structured text for specific credits

  ### Visibility Toggles
  - `dedication_enabled`, `epigraph_enabled`, `preface_enabled` — front matter toggles (default false)
  - `epilogue_enabled`, `acknowledgements_enabled`, `specific_credits_enabled` — back matter toggles (default false)

  ### Timestamps
  - `created_at` — Record creation timestamp
  - `updated_at` — Last update timestamp

  ## Security
  - RLS enabled; all access restricted to the owning user via `auth.uid() = user_id`
  - Separate policies for SELECT, INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS biography_book_structure (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id                uuid NOT NULL UNIQUE REFERENCES biographies(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  dedication_content          text DEFAULT NULL,
  epigraph_content            text DEFAULT NULL,
  epigraph_source             text DEFAULT NULL,
  preface_content             text DEFAULT NULL,

  epilogue_content            text DEFAULT NULL,
  acknowledgements_content    text DEFAULT NULL,
  specific_credits_content    text DEFAULT NULL,

  dedication_enabled          boolean NOT NULL DEFAULT false,
  epigraph_enabled            boolean NOT NULL DEFAULT false,
  preface_enabled             boolean NOT NULL DEFAULT false,
  epilogue_enabled            boolean NOT NULL DEFAULT false,
  acknowledgements_enabled    boolean NOT NULL DEFAULT false,
  specific_credits_enabled    boolean NOT NULL DEFAULT false,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE biography_book_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own book structure"
  ON biography_book_structure
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own book structure"
  ON biography_book_structure
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own book structure"
  ON biography_book_structure
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own book structure"
  ON biography_book_structure
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
