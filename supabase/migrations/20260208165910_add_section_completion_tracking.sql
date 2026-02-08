/*
  # Section Completion Tracking and Narrative Structure

  1. New Tables
    - `section_completions`
      - `id` (uuid, primary key)
      - `biography_id` (uuid, foreign key to biographies)
      - `section_key` (text) - the section identifier
      - `completed_at` (timestamptz) - when section was marked complete
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
    
    - `narrative_structures`
      - `id` (uuid, primary key)
      - `biography_id` (uuid, foreign key to biographies)
      - `user_id` (uuid, foreign key to auth.users)
      - `original_order` (jsonb) - original section order
      - `selected_order` (jsonb) - selected section order
      - `structure_type` (text) - 'chronological', 'thematic', 'career', 'relationships', etc.
      - `rationale` (text) - explanation of structure choice
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
*/

-- Create section_completions table
CREATE TABLE IF NOT EXISTS section_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES biographies(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(biography_id, section_key)
);

ALTER TABLE section_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own section completions"
  ON section_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own section completions"
  ON section_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section completions"
  ON section_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own section completions"
  ON section_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create narrative_structures table
CREATE TABLE IF NOT EXISTS narrative_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid NOT NULL REFERENCES biographies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_order jsonb NOT NULL DEFAULT '[]',
  selected_order jsonb NOT NULL DEFAULT '[]',
  structure_type text DEFAULT 'chronological',
  rationale text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(biography_id)
);

ALTER TABLE narrative_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own narrative structures"
  ON narrative_structures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own narrative structures"
  ON narrative_structures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own narrative structures"
  ON narrative_structures FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own narrative structures"
  ON narrative_structures FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_section_completions_biography_id ON section_completions(biography_id);
CREATE INDEX IF NOT EXISTS idx_section_completions_user_id ON section_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_narrative_structures_biography_id ON narrative_structures(biography_id);
CREATE INDEX IF NOT EXISTS idx_narrative_structures_user_id ON narrative_structures(user_id);
