/*
  # Create conversation checkpoints table

  1. New Tables
    - `conversation_checkpoints`
      - `id` (uuid, primary key) - Unique identifier for the checkpoint
      - `user_id` (uuid, foreign key) - References auth.users, user who owns this checkpoint
      - `biography_id` (uuid, foreign key) - References biographies, biography being edited
      - `section` (varchar) - Section key (e.g., 'childhood', 'education')
      - `conversation_log` (jsonb) - Array of conversation messages with role, content, timestamp
      - `questions_completed` (integer) - Number of questions answered so far
      - `last_question` (text) - The last question asked to user
      - `answers` (jsonb) - Array of Q&A pairs for generating draft
      - `is_follow_up` (boolean) - Whether currently in a follow-up question
      - `has_had_follow_up` (boolean) - Whether a follow-up has been asked for current main question
      - `created_at` (timestamptz) - When checkpoint was created
      - `updated_at` (timestamptz) - When checkpoint was last updated

  2. Security
    - Enable RLS on `conversation_checkpoints` table
    - Add policies for authenticated users to manage their own checkpoints

  3. Indexes
    - Index on biography_id and section for fast lookups
*/

CREATE TABLE IF NOT EXISTS conversation_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  biography_id uuid REFERENCES biographies(id) ON DELETE CASCADE NOT NULL,
  section varchar(50) NOT NULL,
  conversation_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions_completed integer DEFAULT 0,
  last_question text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_follow_up boolean DEFAULT false,
  has_had_follow_up boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_bio_section 
  ON conversation_checkpoints(biography_id, section);

CREATE INDEX IF NOT EXISTS idx_checkpoints_user 
  ON conversation_checkpoints(user_id);

ALTER TABLE conversation_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkpoints"
  ON conversation_checkpoints
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkpoints"
  ON conversation_checkpoints
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkpoints"
  ON conversation_checkpoints
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkpoints"
  ON conversation_checkpoints
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
