/*
  # Fix mutable search_path on functions

  ## Summary
  Sets `search_path = ''` on all three public functions that had a mutable
  search_path. This prevents search-path hijacking attacks where a malicious
  schema placed earlier in the path could shadow built-in or intended functions.
  All object references in the function bodies are fully qualified with their
  schema prefix.

  ## Affected Functions
  - public.update_updated_at
  - public.check_biography_media_limit
  - public.delete_user_account
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_biography_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.biography_media
    WHERE biography_id = NEW.biography_id
  ) >= 10 THEN
    RAISE EXCEPTION 'A biography may have at most 10 media items.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM public.biographies WHERE user_id = current_user_id;
  DELETE FROM public.conversation_checkpoints WHERE user_id = current_user_id;
  DELETE FROM public.section_completions WHERE user_id = current_user_id;
  DELETE FROM public.narrative_structures WHERE user_id = current_user_id;
  DELETE FROM public.ai_rate_limits WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;
  DELETE FROM auth.users WHERE id = current_user_id;

  RETURN jsonb_build_object('success', true, 'deleted_at', now());

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
