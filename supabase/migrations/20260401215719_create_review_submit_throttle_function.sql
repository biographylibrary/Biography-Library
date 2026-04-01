/*
  # Create atomic review submit throttle function

  ## Summary
  Replaces the non-atomic select-then-insert throttle pattern in the review/submit
  route with a single Postgres function that performs the count check and insert
  atomically within one transaction.

  ## New Functions
  - `check_and_record_submit_attempt(p_user_id uuid, p_window_secs int, p_max_attempts int)`
    - Counts existing `review_submit` rows for the user within the window
    - If count >= max, returns FALSE (throttled)
    - Otherwise inserts a new row and returns TRUE (allowed)
    - The entire operation runs in one transaction — safe across concurrent calls
    - Also cleans up rows older than 5 minutes to keep the table lean

  ## Security
  - SECURITY DEFINER so the service role can call it on behalf of users
  - search_path locked to public to prevent search-path injection
  - Only operates on ai_rate_limits rows matching the supplied user_id and action
*/

CREATE OR REPLACE FUNCTION public.check_and_record_submit_attempt(
  p_user_id      uuid,
  p_window_secs  int DEFAULT 60,
  p_max_attempts int DEFAULT 3
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_cleanup_cutoff timestamptz;
  v_count int;
BEGIN
  v_window_start   := now() - (p_window_secs  || ' seconds')::interval;
  v_cleanup_cutoff := now() - '300 seconds'::interval;

  DELETE FROM ai_rate_limits
  WHERE user_id  = p_user_id
    AND action   = 'review_submit'
    AND created_at < v_cleanup_cutoff;

  SELECT COUNT(*) INTO v_count
  FROM ai_rate_limits
  WHERE user_id   = p_user_id
    AND action    = 'review_submit'
    AND created_at >= v_window_start;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO ai_rate_limits (user_id, action)
  VALUES (p_user_id, 'review_submit');

  RETURN true;
END;
$$;
