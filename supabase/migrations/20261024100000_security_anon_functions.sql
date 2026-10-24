-- Restringe EXECUTE su funzioni esposte ad anon / PUBLIC e chiude due buchi
-- di SECURITY DEFINER: get_ai_usage (solo il proprio user_id o service_role)
-- e increment_view_count (solo biografie published).
-- Idempotente. Non applicare automaticamente: su Zurigo con apply_migration
-- versione 20261024100000. Non tocca Irlanda.

-- 1. cleanup_ai_rate_limits_30d: solo service_role (cron Next.js)
REVOKE ALL ON FUNCTION public.cleanup_ai_rate_limits_30d() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_ai_rate_limits_30d() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_ai_rate_limits_30d() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ai_rate_limits_30d() TO service_role;

-- 2. get_ai_usage: l'utente autenticato può leggere solo il proprio conteggio;
--    service_role può passare qualsiasi p_user_id. Chiamante noto:
--    components/editor/ai-usage-indicator.tsx (passa user.id). Nessuna Edge Function.
CREATE OR REPLACE FUNCTION public.get_ai_usage(p_user_id uuid)
RETURNS TABLE(daily_count integer, weekly_count integer, daily_reset_at timestamptz, weekly_reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  now_utc timestamptz := now() AT TIME ZONE 'UTC';
  today_start timestamptz := date_trunc('day', now_utc);
  week_start timestamptz := date_trunc('week', now_utc);
  rec ai_usage_tracking%ROWTYPE;
BEGIN
  -- SECURITY DEFINER: current_user è il proprietario della funzione, non il chiamante.
  -- Il ruolo API arriva dal JWT (PostgREST / client service_role tramite auth.role()).
  IF p_user_id IS DISTINCT FROM (SELECT auth.uid())
     AND NOT coalesce((SELECT auth.role()) = 'service_role', false) THEN
    RETURN;
  END IF;

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

REVOKE ALL ON FUNCTION public.get_ai_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_usage(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage(uuid) TO service_role;

-- 3. increment_view_count: solo schede pubblicate (permessi invariati: anon + authenticated)
CREATE OR REPLACE FUNCTION public.increment_view_count(biography_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
UPDATE biographies
SET view_count = view_count + 1
WHERE id = biography_uuid
  AND status = 'published';
$$;

-- 4. Funzioni solo-trigger (RETURNS trigger; nessuna chiamata .rpc dall'app):
--    biographies_mark_pioneer, handle_new_user, set_biography_slug,
--    set_next_chapter_available_at, update_moderation_reports_updated_at
REVOKE ALL ON FUNCTION public.biographies_mark_pioneer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.biographies_mark_pioneer() FROM anon;
REVOKE ALL ON FUNCTION public.biographies_mark_pioneer() FROM authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.set_biography_slug() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_biography_slug() FROM anon;
REVOKE ALL ON FUNCTION public.set_biography_slug() FROM authenticated;

REVOKE ALL ON FUNCTION public.set_next_chapter_available_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_next_chapter_available_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_next_chapter_available_at() FROM authenticated;

REVOKE ALL ON FUNCTION public.update_moderation_reports_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_moderation_reports_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_moderation_reports_updated_at() FROM authenticated;
