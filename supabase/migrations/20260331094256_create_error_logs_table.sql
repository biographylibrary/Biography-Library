/*
  # Create error_logs table

  ## Purpose
  Stores runtime errors and important client-side events sent from the
  browser via the log-error Edge Function. The Edge Function uses the
  service role key to insert rows, so no direct client access is needed.

  ## New Tables
  - `error_logs`
    - `id` (uuid, primary key)
    - `created_at` (timestamptz, default now())
    - `level` (text, not null) — "critical" | "error" | "warn" | "info"
    - `message` (text, not null)
    - `metadata` (jsonb, nullable) — arbitrary structured data
    - `url` (text, nullable) — browser URL at time of log
    - `user_agent` (text, nullable)
    - `user_id` (uuid, nullable) — authenticated user if available
    - `source` (text, nullable) — optional caller tag
    - `resolved` (boolean, default false) — for admin triage

  ## Indexes
  - `idx_error_logs_created_at` on created_at DESC
  - `idx_error_logs_level` on level
  - `idx_error_logs_resolved` on resolved

  ## Security
  - RLS enabled — table locked down to no direct client access
  - All writes happen via the log-error Edge Function using the service role,
    which bypasses RLS entirely. No client-facing policies are created.
  - Admin reads should be done via service role in server-side context.
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb NULL,
  url text NULL,
  user_agent text NULL,
  user_id uuid NULL,
  source text NULL,
  resolved boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs (level);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs (resolved);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
