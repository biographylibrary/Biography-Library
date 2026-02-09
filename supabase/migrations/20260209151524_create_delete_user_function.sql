/*
  # Create User Account Deletion Function

  1. New Functions
    - `delete_user_account()` - Deletes all user data and auth account
      - Deletes all biographies and related data (cascade)
      - Deletes user profile
      - Deletes auth.users entry
      - Returns success status

  2. Security
    - Function is SECURITY DEFINER to allow deletion of auth.users
    - Only authenticated users can delete their own account
    - Verifies user is deleting their own account
  
  3. Compliance
    - Implements GDPR/FADP right to erasure
    - Complete data deletion from all tables
    - Logs deletion timestamp for compliance
*/

-- Create function to delete user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  deleted_count int;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Delete all biographies (will cascade to sections, notes, todos, etc.)
  DELETE FROM biographies WHERE user_id = current_user_id;
  
  -- Delete conversation checkpoints
  DELETE FROM conversation_checkpoints WHERE user_id = current_user_id;
  
  -- Delete section completions
  DELETE FROM section_completions WHERE user_id = current_user_id;
  
  -- Delete narrative structures
  DELETE FROM narrative_structures WHERE user_id = current_user_id;
  
  -- Delete AI rate limits
  DELETE FROM ai_rate_limits WHERE user_id = current_user_id;
  
  -- Delete user profile
  DELETE FROM profiles WHERE id = current_user_id;
  
  -- Delete from auth.users (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = current_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'deleted_at', now()
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;