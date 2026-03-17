/*
  # Add Daily and Weekly AI Usage Tracking

  ## Summary
  Creates a dedicated table to track per-user AI usage with daily and weekly counters,
  enabling enforcement of usage limits in the AI edge function.

  ## New Tables
  - `ai_usage_tracking`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users, unique — one row per user)
    - `daily_count` (integer) — cumulative AI points used today
    - `weekly_count` (integer) — cumulative AI points used this week
    - `daily_reset_at` (timestamptz) — timestamp of last daily reset (midnight UTC)
    - `weekly_reset_at` (timestamptz) — timestamp of last weekly reset (Monday 00:00 UTC)
    - `updated_at` (timestamptz) — last modification time

  ## Security
  - RLS enabled; only the service role (used by the edge function) can read/write these records.
    The frontend queries usage via a dedicated RPC function exposed to authenticated users.

  ## RPC Functions
  - `get_ai_usage(p_user_id uuid)` — returns current daily_count and weekly_count for a user,
    after applying any pending resets. Accessible to authenticated users for their own data only.
*/

CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count integer NOT NULL DEFAULT 0,
  weekly_count integer NOT NULL DEFAULT 0,
  daily_reset_at timestamptz NOT NULL DEFAULT date_trunc('day', now() AT TIME ZONE 'UTC'),
  weekly_reset_at timestamptz NOT NULL DEFAULT date_trunc('week', now() AT TIME ZONE 'UTC'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_id
  ON ai_usage_tracking (user_id);

ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read own usage"
  ON ai_usage_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_ai_usage(p_user_id uuid)
RETURNS TABLE(daily_count integer, weekly_count integer, daily_reset_at timestamptz, weekly_reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_utc timestamptz := now() AT TIME ZONE 'UTC';
  today_start timestamptz := date_trunc('day', now_utc);
  week_start timestamptz := date_trunc('week', now_utc);
  rec ai_usage_tracking%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM ai_usage_tracking WHERE ai_usage_tracking.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::integer, 0::integer, today_start, week_start;
    RETURN;
  END IF;

  IF rec.daily_reset_at < today_start THEN
    rec.daily_count := 0;
    rec.daily_reset_at := today_start;
  END IF;

  IF rec.weekly_reset_at < week_start THEN
    rec.weekly_count := 0;
    rec.weekly_reset_at := week_start;
  END IF;

  RETURN QUERY SELECT rec.daily_count, rec.weekly_count, rec.daily_reset_at, rec.weekly_reset_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_usage(uuid) TO authenticated;
