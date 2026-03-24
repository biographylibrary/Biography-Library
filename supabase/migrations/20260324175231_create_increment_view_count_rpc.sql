/*
  # Create increment_view_count RPC function

  ## Summary
  Creates a SECURITY DEFINER function that increments the view_count on a biography row
  by 1. It bypasses RLS so it can be called without authentication from the public
  biography view page.

  ## Function
  - `increment_view_count(biography_uuid uuid)` — increments view_count by 1 for the
    given biography ID. No return value. Safe to call without auth.

  ## Security Notes
  - SECURITY DEFINER runs with the privileges of the function owner (postgres), bypassing RLS.
  - The function is granted EXECUTE to the `anon` role so unauthenticated visitors can call it.
  - It only performs a targeted UPDATE on a single row by primary key; no data is exposed.
*/

CREATE OR REPLACE FUNCTION increment_view_count(biography_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE biographies
  SET view_count = view_count + 1
  WHERE id = biography_uuid;
$$;

GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO authenticated;
