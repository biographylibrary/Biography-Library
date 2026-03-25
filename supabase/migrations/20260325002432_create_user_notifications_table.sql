/*
  # Create user_notifications table

  ## Summary
  Creates a simple notification system for users to receive in-app messages,
  primarily used to notify biography authors when their moderation status changes
  (e.g., from 'under_review' to 'published' or 'draft' after an admin decision).

  ## New Tables
  - `user_notifications`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → profiles, cascade delete)
    - `message` (text, the notification message shown to the user)
    - `is_read` (boolean, default false — drives the unread badge count)
    - `created_at` (timestamptz, default now())

  ## Security
  - RLS enabled: users can only see, insert, and update their own rows.
  - SELECT policy: user_id = auth.uid()
  - INSERT policy: user_id = auth.uid() (so only the owning user can insert, or use service role from edge functions/admin flows)
  - UPDATE policy: user_id = auth.uid() (so users can mark their own notifications as read)
  - DELETE policy: user_id = auth.uid()

  ## Notes
  - No triggers needed; notifications are created programmatically when moderation decisions are made.
  - Index on (user_id, is_read) for fast unread count queries.
*/

CREATE TABLE IF NOT EXISTS user_notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    text        NOT NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications (user_id, is_read);

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
