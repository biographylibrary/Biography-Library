/*
  # Contatori di frequenza per azione

  `check_and_record_submit_attempt` usava l'azione fissa `review_submit` per
  più rotte (sottomissione, approvazione PDF, bozza AI). Ora ogni rotta passa
  la propria azione (`p_action`), così controllo finale, sottomissione e
  correzione non si consumano a vicenda.

  Si elimina la firma a tre argomenti e si ricrea con `p_action` (default
  `review_submit` per compatibilità).
*/

DROP FUNCTION IF EXISTS public.check_and_record_submit_attempt(uuid, int, int);

CREATE OR REPLACE FUNCTION public.check_and_record_submit_attempt(
  p_user_id      uuid,
  p_window_secs  int DEFAULT 60,
  p_max_attempts int DEFAULT 3,
  p_action       text DEFAULT 'review_submit'
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
  v_action text;
BEGIN
  v_action := COALESCE(NULLIF(trim(p_action), ''), 'review_submit');
  v_window_start   := now() - (p_window_secs  || ' seconds')::interval;
  v_cleanup_cutoff := now() - '300 seconds'::interval;

  DELETE FROM ai_rate_limits
  WHERE user_id  = p_user_id
    AND action   = v_action
    AND created_at < v_cleanup_cutoff;

  SELECT COUNT(*) INTO v_count
  FROM ai_rate_limits
  WHERE user_id   = p_user_id
    AND action    = v_action
    AND created_at >= v_window_start;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO ai_rate_limits (user_id, action)
  VALUES (p_user_id, v_action);

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.check_and_record_submit_attempt(uuid, int, int, text) IS
  'Contatore atomico per utente e azione (review_submit, approve_final_pdf, preprint_check, …).';

REVOKE ALL ON FUNCTION public.check_and_record_submit_attempt(uuid, int, int, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_submit_attempt(uuid, int, int, text)
  TO service_role;
