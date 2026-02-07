/*
  # Create section notes and todos tables

  1. New Tables
    - `section_notes`
      - `id` (uuid, primary key)
      - `biography_id` (uuid, foreign key to biographies)
      - `section` (varchar, section key)
      - `content` (text, note content)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

    - `section_todos`
      - `id` (uuid, primary key)
      - `biography_id` (uuid, foreign key to biographies)
      - `section` (varchar, section key)
      - `description` (text, todo description)
      - `is_completed` (boolean, completion status)
      - `priority` (varchar, priority level: low/medium/high)
      - `due_date` (date, optional due date)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own notes and todos
*/

CREATE TABLE IF NOT EXISTS section_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid REFERENCES biographies(id) ON DELETE CASCADE NOT NULL,
  section varchar(50) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS section_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id uuid REFERENCES biographies(id) ON DELETE CASCADE NOT NULL,
  section varchar(50) NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false NOT NULL,
  priority varchar(20) DEFAULT 'medium' NOT NULL,
  due_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_section_notes_biography_id ON section_notes(biography_id);
CREATE INDEX IF NOT EXISTS idx_section_notes_section ON section_notes(section);
CREATE INDEX IF NOT EXISTS idx_section_todos_biography_id ON section_todos(biography_id);
CREATE INDEX IF NOT EXISTS idx_section_todos_section ON section_todos(section);
CREATE INDEX IF NOT EXISTS idx_section_todos_completed ON section_todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_section_todos_due_date ON section_todos(due_date);

ALTER TABLE section_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own section notes"
  ON section_notes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can insert own section notes"
  ON section_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can update own section notes"
  ON section_notes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can delete own section notes"
  ON section_notes FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can view own section todos"
  ON section_todos FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can insert own section todos"
  ON section_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can update own section todos"
  ON section_todos FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );

CREATE POLICY "Users can delete own section todos"
  ON section_todos FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM biographies WHERE id = biography_id)
  );
