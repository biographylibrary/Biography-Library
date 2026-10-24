CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- baseline_zurich — generated 2026-10-22T10:32:17.889Z
-- Istantanea dello schema (nessun dato) al 22 ottobre 2026, usata per creare lo schema su Zurigo;
-- solo per ricostruzione di emergenza. Le migrazioni in supabase/migrations/ con versione
-- maggiore di 20261022000000 si applicano sopra.

-- ========== public schema (from pg_dump, sanitized) ==========
--
-- PostgreSQL database dump
--

\restrict nKwgvQjVkBlpLM8eqY0MXrvKGM1k9rNFQk0CQXeHDcHVCULz2oi9BW4jKlPoZeh

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--
CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: ai_author_token_usage(uuid, timestamp with time zone, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ai_author_token_usage(p_user_id uuid, p_now timestamp with time zone DEFAULT now(), p_purposes text[] DEFAULT ARRAY['echo'::text, 'grammar'::text]) RETURNS TABLE(daily_tokens bigint, weekly_tokens bigint, monthly_tokens bigint, daily_resets_at timestamp with time zone, weekly_resets_at timestamp with time zone, monthly_resets_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH local_now AS (
    SELECT p_now AT TIME ZONE 'Europe/Zurich' AS t
  ),
  bounds AS (
    SELECT
      (date_trunc('day',   t) AT TIME ZONE 'Europe/Zurich') AS d0,
      (date_trunc('week',  t) AT TIME ZONE 'Europe/Zurich') AS w0,
      (date_trunc('month', t) AT TIME ZONE 'Europe/Zurich') AS m0,
      ((date_trunc('day',   t) + interval '1 day')   AT TIME ZONE 'Europe/Zurich') AS d1,
      ((date_trunc('week',  t) + interval '1 week')  AT TIME ZONE 'Europe/Zurich') AS w1,
      ((date_trunc('month', t) + interval '1 month') AT TIME ZONE 'Europe/Zurich') AS m1
    FROM local_now
  ),
  rows_in_scope AS (
    SELECT
      u.created_at,
      COALESCE(u.total_tokens, COALESCE(u.prompt_tokens, 0) + COALESCE(u.completion_tokens, 0)) AS tokens
    FROM public.ai_token_usage u, bounds b
    WHERE u.user_id = p_user_id
      AND u.purpose = ANY (p_purposes)
      AND u.created_at >= LEAST(b.w0, b.m0)
      AND u.created_at <= p_now
  )
  SELECT
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.d0), 0)::bigint,
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.w0), 0)::bigint,
    COALESCE(SUM(r.tokens) FILTER (WHERE r.created_at >= b.m0), 0)::bigint,
    b.d1, b.w1, b.m1
  FROM bounds b
  LEFT JOIN rows_in_scope r ON true
  GROUP BY b.d0, b.w0, b.m0, b.d1, b.w1, b.m1;
$$;


--
-- Name: author_text_child_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.author_text_child_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  parent_ids uuid[];
  pid uuid;
  parent_status text;
  parent_frozen boolean;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    parent_ids := ARRAY[NEW.biography_id];
  ELSIF TG_OP = 'DELETE' THEN
    parent_ids := ARRAY[OLD.biography_id];
  ELSE
    -- Anche lo spostamento di una riga da una scheda a un'altra conta.
    parent_ids := ARRAY[OLD.biography_id, NEW.biography_id];
  END IF;

  FOREACH pid IN ARRAY parent_ids LOOP
    parent_status := NULL;
    SELECT b.status, COALESCE(b.is_frozen, false)
      INTO parent_status, parent_frozen
      FROM public.biographies b
     WHERE b.id = pid;

    IF parent_status IS NULL
       OR parent_frozen
       OR NOT (parent_status = ANY (public.author_text_writable_statuses())) THEN
      RAISE EXCEPTION 'author_text_locked: % (stato %)', TG_TABLE_NAME, COALESCE(parent_status, 'scheda non accessibile')
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: author_text_writable_statuses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.author_text_writable_statuses() RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT ARRAY[
    'draft', 'sections_complete', 'final_version',
    'pdf_draft',
    'revision_requested'
  ]::text[];
$$;


--
-- Name: biographies_author_text_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_author_text_columns() RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT ARRAY[
    'title', 'content', 'content_freeflow', 'final_version', 'narrative_order',
    'author_name', 'subject_name',
    'name_as_written', 'name_given', 'name_family', 'name_order',
    'name_romanized', 'romanization_system',
    'content_html_legacy'
  ]::text[];
$$;


--
-- Name: biographies_edition_rules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_edition_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  parent public.biographies%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.translation_of IS DISTINCT FROM OLD.translation_of THEN
    RAISE EXCEPTION 'translation_of is immutable once assigned'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.translation_of IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO parent FROM public.biographies WHERE id = NEW.translation_of;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'translation_original_missing'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF parent.translation_of IS NOT NULL THEN
    RAISE EXCEPTION 'translation_of_edition'
      USING ERRCODE = 'check_violation';
  END IF;
  IF parent.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'translation_owner_mismatch'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: biographies_edition_visibility_rights_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_edition_visibility_rights_immutable() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.translation_of IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.rights_statement_uri IS DISTINCT FROM OLD.rights_statement_uri
       OR NEW.rights_chosen_at IS DISTINCT FROM OLD.rights_chosen_at
       OR NEW.rights_holder IS DISTINCT FROM OLD.rights_holder
     ) THEN
    RAISE EXCEPTION 'edition_visibility_rights_follow_original'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: biographies_guard_author_text(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_guard_author_text() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  cols constant text[] := public.biographies_author_text_columns();
  new_json jsonb := to_jsonb(NEW);
  old_json jsonb := to_jsonb(OLD);
  col text;
  changed text[] := ARRAY[]::text[];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Si guarda lo stato di partenza: i passaggi di stato dell'autore (solo fra
  -- draft, sections_complete e final_version) li controlla già il guard a00_.
  IF OLD.status = ANY (public.author_text_writable_statuses())
     AND NOT COALESCE(OLD.is_frozen, false) THEN
    RETURN NEW;
  END IF;

  FOREACH col IN ARRAY cols LOOP
    IF (new_json -> col) IS DISTINCT FROM (old_json -> col) THEN
      changed := changed || col;
    END IF;
  END LOOP;

  IF array_length(changed, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'author_text_locked: % (stato %)', array_to_string(changed, ', '), OLD.status
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: biographies_guard_server_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_guard_server_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  reserved constant text[] := public.biographies_server_owned_columns();
  defaults constant jsonb := public.biographies_insert_defaults();
  author_statuses constant text[] := ARRAY['draft', 'sections_complete', 'final_version'];
  new_json jsonb := to_jsonb(NEW);
  old_json jsonb;
  col text;
  changed text[] := ARRAY[]::text[];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'server_only_column: status deve essere draft alla creazione'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    FOREACH col IN ARRAY reserved LOOP
      CONTINUE WHEN col IN ('id', 'user_id', 'created_at', 'published_at_iso', 'published_um_year');
      IF (new_json -> col) IS DISTINCT FROM coalesce(defaults -> col, 'null'::jsonb) THEN
        changed := changed || col;
      END IF;
    END LOOP;
    IF NEW.created_at IS DISTINCT FROM now() THEN
      changed := changed || 'created_at'::text;
    END IF;
  ELSE
    old_json := to_jsonb(OLD);
    FOREACH col IN ARRAY reserved LOOP
      IF (new_json -> col) IS DISTINCT FROM (old_json -> col) THEN
        changed := changed || col;
      END IF;
    END LOOP;
    -- Conta anche il punto di partenza: da uno stato non d'autore (sospesa,
    -- in revisione, rimossa, pubblicata...) l'autore non può uscire.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = ANY (author_statuses) AND NEW.status = ANY (author_statuses)) THEN
      changed := changed || 'status'::text;
    END IF;
  END IF;

  IF array_length(changed, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'server_only_column: %', array_to_string(changed, ', ')
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: biographies_insert_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_insert_defaults() RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT jsonb_build_object(
    'schema_version', 2,
    'ai_screening_status', 'pending',
    'is_frozen', false,
    'is_featured', false,
    'view_count', 0,
    'chapters_count', 0,
    'is_pioneer', false
  );
$$;


--
-- Name: biographies_keep_pioneer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_keep_pioneer() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.is_pioneer := OLD.is_pioneer;
  RETURN NEW;
END;
$$;


--
-- Name: biographies_mark_pioneer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_mark_pioneer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  host_n bigint;
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    NEW.is_pioneer := false;
    RETURN NEW;
  END IF;

  host_n := nextval('public.biography_host_seq');
  NEW.is_pioneer := host_n <= 10000;
  RETURN NEW;
END;
$$;


--
-- Name: biographies_require_rights_for_public(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_require_rights_for_public() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.visibility = 'public' AND COALESCE(BTRIM(NEW.rights_statement_uri), '') = '' THEN
    IF TG_OP = 'INSERT'
       OR OLD.visibility IS DISTINCT FROM 'public'
       OR COALESCE(BTRIM(OLD.rights_statement_uri), '') IS DISTINCT FROM COALESCE(BTRIM(NEW.rights_statement_uri), '') THEN
      RAISE EXCEPTION 'una biografia pubblica richiede una licenza registrata: manca la scelta dell''autore';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: biographies_server_owned_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_server_owned_columns() RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT ARRAY[
    'id', 'user_id', 'created_at', 'schema_version',
    'ai_screening_status',
    'published_at', 'published_at_iso', 'published_um_year',
    'provisional_until', 'revised_at',
    'reviewed_by', 'reviewed_at',
    'final_pdf_approved_at', 'final_pdf_url', 'listing_cover_url',
    'export_txt_url', 'export_docx_url',
    'pdf_draft_iteration', 'pdf_draft_started_at', 'pdf_draft_reminder_sent_at',
    'draft_ai_feedback',
    'is_frozen', 'frozen_at', 'frozen_reason',
    'is_featured', 'featured_at', 'featured_by',
    'view_count',
    'chapters_count', 'last_chapter_published_at', 'next_chapter_available_at',
    'chapter_available_email_sent_at',
    'is_pioneer', 'um_id',
    'translation_of',
    'original_version_at'
  ]::text[];
$$;


--
-- Name: biographies_sync_edition_visibility_rights(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_sync_edition_visibility_rights() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.visibility IS NOT DISTINCT FROM OLD.visibility
     AND NEW.rights_statement_uri IS NOT DISTINCT FROM OLD.rights_statement_uri
     AND NEW.rights_chosen_at IS NOT DISTINCT FROM OLD.rights_chosen_at
     AND NEW.rights_holder IS NOT DISTINCT FROM OLD.rights_holder THEN
    RETURN NEW;
  END IF;

  UPDATE public.biographies
  SET
    visibility = NEW.visibility,
    rights_statement_uri = NEW.rights_statement_uri,
    rights_chosen_at = NEW.rights_chosen_at,
    rights_holder = NEW.rights_holder
  WHERE translation_of = NEW.id
    AND (
      visibility IS DISTINCT FROM NEW.visibility
      OR rights_statement_uri IS DISTINCT FROM NEW.rights_statement_uri
      OR rights_chosen_at IS DISTINCT FROM NEW.rights_chosen_at
      OR rights_holder IS DISTINCT FROM NEW.rights_holder
    );

  RETURN NEW;
END;
$$;


--
-- Name: biographies_sync_published_um(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_sync_published_um() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.published_at IS NULL THEN
    NEW.published_at_iso := NULL;
    NEW.published_um_year := NULL;
  ELSE
    NEW.published_at_iso := (NEW.published_at AT TIME ZONE 'UTC')::date;
    NEW.published_um_year := EXTRACT(YEAR FROM (NEW.published_at AT TIME ZONE 'UTC'))::integer - 2026;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: biographies_um_id_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biographies_um_id_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.um_id IS NOT NULL AND NEW.um_id IS DISTINCT FROM OLD.um_id THEN
    RAISE EXCEPTION 'um_id is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: biography_public_read_allowed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.biography_public_read_allowed(p_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.biographies b
    JOIN public.profiles p ON p.id = b.user_id
    WHERE b.id = p_id
      AND b.status = 'published'
      AND b.visibility = 'public'
      AND p.account_status = 'active'
      AND (
        b.translation_of IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.biographies o
          JOIN public.profiles op ON op.id = o.user_id
          WHERE o.id = b.translation_of
            AND o.translation_of IS NULL
            AND o.status = 'published'
            AND o.visibility = 'public'
            AND op.account_status = 'active'
        )
      )
  );
$$;


--
-- Name: check_and_record_submit_attempt(uuid, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_record_submit_attempt(p_user_id uuid, p_window_secs integer DEFAULT 60, p_max_attempts integer DEFAULT 3, p_action text DEFAULT 'review_submit'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: check_biography_media_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_biography_media_limit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.layout IN ('cover', 'cover_a5') THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.biography_media
    WHERE biography_id = NEW.biography_id
      AND layout NOT IN ('cover', 'cover_a5')
  ) >= 15 THEN
    RAISE EXCEPTION 'A biography may have at most 15 gallery photos.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: cleanup_ai_rate_limits_30d(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_ai_rate_limits_30d() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DELETE FROM ai_rate_limits WHERE created_at < now() - interval '30 days';
$$;


--
-- Name: delete_user_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_account() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: edition_caption_media_on_original(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.edition_caption_media_on_original() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  original_id uuid;
BEGIN
  SELECT b.translation_of INTO original_id
  FROM public.biographies b
  WHERE b.id = NEW.biography_id;

  IF original_id IS NULL THEN
    RAISE EXCEPTION 'caption_requires_edition'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.biography_media m
    WHERE m.id = NEW.media_id
      AND m.biography_id = original_id
  ) THEN
    RAISE EXCEPTION 'caption_media_not_on_original'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_one_biography_per_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_one_biography_per_user() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.biographies
    WHERE user_id = NEW.user_id
      AND translation_of IS NULL
  ) THEN
    RAISE EXCEPTION 'one_biography_per_user'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_biography_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_biography_slug(input_text text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
base_slug TEXT;
candidate TEXT;
counter   INT := 2;
BEGIN
-- Lowercase
base_slug := lower(input_text);

-- Replace accented / special Latin characters with ASCII equivalents
base_slug := translate(base_slug,
'àáâãäåèéêëìíîïòóôõöùúûüýÿñçßæœ',
'aaaaaaeeeeiiiioooooouuuuyynsaaeo'
);
base_slug := replace(base_slug, 'ß', 'ss');
base_slug := replace(base_slug, 'æ',  'ae');
base_slug := replace(base_slug, 'œ',  'oe');

-- Replace non-alphanumeric with hyphen
base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');

-- Collapse multiple hyphens
base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');

-- Trim leading/trailing hyphens
base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

-- If the slug is empty after sanitization, use a fallback
IF base_slug = '' OR base_slug IS NULL THEN
base_slug := 'biography';
END IF;

candidate := base_slug;

-- Ensure uniqueness
WHILE EXISTS (SELECT 1 FROM biographies WHERE slug = candidate) LOOP
candidate := base_slug || '-' || counter;
counter := counter + 1;
END LOOP;

RETURN candidate;
END;
$_$;


--
-- Name: get_ai_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_usage(p_user_id uuid) RETURNS TABLE(daily_count integer, weekly_count integer, daily_reset_at timestamp with time zone, weekly_reset_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
now_utc timestamptz := now() AT TIME ZONE 'UTC';
today_start timestamptz := date_trunc('day', now_utc);
week_start timestamptz := date_trunc('week', now_utc);
rec ai_usage_tracking%ROWTYPE;
BEGIN
-- Solo il proprio user_id, oppure service_role (vedi 20261024100000).
-- SECURITY DEFINER: il ruolo API è nel JWT, non in current_user.
IF p_user_id IS DISTINCT FROM (SELECT auth.uid())
   AND coalesce(current_setting('request.jwt.claim.role', true), '')
       IS DISTINCT FROM 'service_role' THEN
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


--
-- Name: get_biography_by_share_token(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_biography_by_share_token(p_biography_id uuid, p_token text) RETURNS TABLE(id uuid, title text, author_name text, subject_name text, biography_type text, content jsonb, visibility text, status text, share_token text, created_at timestamp with time zone, published_at timestamp with time zone, is_frozen boolean, frozen_at timestamp with time zone, listing_cover_url text, section_name text, section_created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.author_name,
    b.subject_name,
    b.biography_type::text,
    b.content,
    b.visibility,
    b.status,
    b.share_token,
    b.created_at,
    b.published_at,
    b.is_frozen,
    b.frozen_at,
    b.listing_cover_url,
    s.section_name,
    s.created_at AS section_created_at
  FROM public.biographies b
  LEFT JOIN public.biography_sections s
    ON s.biography_id = b.id
  WHERE b.id          = p_biography_id
    AND b.visibility  = 'link-only'
    AND b.share_token IS NOT NULL
    AND b.share_token = p_token
  ORDER BY s.created_at ASC NULLS LAST;
END;
$$;


--
-- Name: get_my_account_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_account_status() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT account_status FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


--
-- Name: handle_biography_published(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_biography_published() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM 'published') THEN

    IF COALESCE(OLD.chapters_count, 0) > 0
       AND OLD.next_chapter_available_at IS NOT NULL
       AND now() < OLD.next_chapter_available_at
       AND COALESCE(public.get_my_role(), 'user') NOT IN ('reviewer', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'chapter_cooldown_active'
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.last_chapter_published_at := now();
    NEW.chapters_count := COALESCE(OLD.chapters_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  signup_lang text;
BEGIN
  signup_lang := LOWER(LEFT(COALESCE(NEW.raw_user_meta_data->>'language', ''), 2));
  IF signup_lang NOT IN ('en', 'it', 'fr', 'de') THEN
    signup_lang := 'en';
  END IF;

  INSERT INTO public.profiles (id, email, name, language, language_confirmed_at, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    signup_lang,
    NOW(),
    'waitlist'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;


--
-- Name: increment_biography_chapters(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_biography_chapters(biography_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE biographies
  SET
    last_chapter_published_at = now(),
    chapters_count = chapters_count + 1
  WHERE id = biography_id
    AND user_id = auth.uid()
    AND status = 'published';
END;
$$;


--
-- Name: increment_view_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_view_count(biography_uuid uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
UPDATE biographies
SET view_count = view_count + 1
WHERE id = biography_uuid
  AND status = 'published';
$$;


--
-- Name: profile_account_is_active(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profile_account_is_active(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT account_status = 'active' FROM public.profiles WHERE id = p_user_id LIMIT 1),
    false
  );
$$;


--
-- Name: profiles_guard_server_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profiles_guard_server_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  reserved constant text[] := public.profiles_server_owned_columns();
  defaults constant jsonb := public.profiles_insert_defaults();
  new_json jsonb := to_jsonb(NEW);
  old_json jsonb;
  col text;
  changed text[] := ARRAY[]::text[];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    FOREACH col IN ARRAY reserved LOOP
      -- La versione della dichiarazione ha un valore predefinito che può cambiare.
      CONTINUE WHEN col IN ('id', 'created_at', 'legal_declaration_version');
      IF (new_json -> col) IS DISTINCT FROM coalesce(defaults -> col, 'null'::jsonb) THEN
        changed := changed || col;
      END IF;
    END LOOP;
    IF NEW.created_at IS DISTINCT FROM now() THEN
      changed := changed || 'created_at'::text;
    END IF;
  ELSE
    old_json := to_jsonb(OLD);
    FOREACH col IN ARRAY reserved LOOP
      IF (new_json -> col) IS DISTINCT FROM (old_json -> col) THEN
        changed := changed || col;
      END IF;
    END LOOP;
  END IF;

  IF array_length(changed, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'server_only_column: %', array_to_string(changed, ', ')
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: profiles_insert_defaults(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profiles_insert_defaults() RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT jsonb_build_object(
    'role', 'user',
    'account_status', 'waitlist',
    'ai_features_enabled', false
  );
$$;


--
-- Name: profiles_server_owned_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profiles_server_owned_columns() RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  SELECT ARRAY[
    'id', 'created_at',
    'role', 'account_status', 'waitlist_granted_at',
    'legal_declaration_accepted_at', 'legal_declaration_type', 'legal_declaration_version',
    'welcome_email_sent_at',
    'ai_features_enabled'
  ]::text[];
$$;


--
-- Name: regenerate_share_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_share_token(p_biography_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
v_caller_id   uuid;
v_is_owner    boolean;
v_is_staff    boolean;
v_new_token   text;
BEGIN
v_caller_id := auth.uid();

IF v_caller_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
END IF;

SELECT (user_id = v_caller_id) INTO v_is_owner
FROM public.biographies
WHERE id = p_biography_id;

IF v_is_owner IS NULL THEN
RAISE EXCEPTION 'Biography not found' USING ERRCODE = 'P0002';
END IF;

SELECT (role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])) INTO v_is_staff
FROM public.profiles
WHERE id = v_caller_id;

IF NOT (v_is_owner OR COALESCE(v_is_staff, false)) THEN
RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
END IF;

v_new_token := gen_random_uuid()::text;

UPDATE public.biographies
SET share_token = v_new_token
WHERE id = p_biography_id;

RETURN v_new_token;
END;
$$;


--
-- Name: reject_life_facts_on_edition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_life_facts_on_edition() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.biographies b
    WHERE b.id = NEW.biography_id AND b.translation_of IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'life_facts_belong_to_original'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: reset_biography_engagement_email_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_biography_engagement_email_flags() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.next_chapter_available_at IS DISTINCT FROM OLD.next_chapter_available_at THEN
      NEW.chapter_available_email_sent_at := NULL;
    END IF;

    IF OLD.status = 'pdf_draft' AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.pdf_draft_reminder_sent_at := NULL;
    END IF;

    IF NEW.status = 'pdf_draft'
       AND OLD.status IS DISTINCT FROM 'pdf_draft'
       AND NEW.pdf_draft_started_at IS DISTINCT FROM OLD.pdf_draft_started_at THEN
      NEW.pdf_draft_reminder_sent_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: revoke_share_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_share_token(p_biography_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
v_caller_id uuid;
v_is_owner  boolean;
v_is_staff  boolean;
BEGIN
v_caller_id := auth.uid();

IF v_caller_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
END IF;

SELECT (user_id = v_caller_id) INTO v_is_owner
FROM public.biographies
WHERE id = p_biography_id;

IF v_is_owner IS NULL THEN
RAISE EXCEPTION 'Biography not found' USING ERRCODE = 'P0002';
END IF;

SELECT (role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])) INTO v_is_staff
FROM public.profiles
WHERE id = v_caller_id;

IF NOT (v_is_owner OR COALESCE(v_is_staff, false)) THEN
RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
END IF;

UPDATE public.biographies
SET share_token = NULL
WHERE id = p_biography_id;
END;
$$;


--
-- Name: set_biography_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_biography_slug() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
IF NEW.slug IS NULL AND NEW.title IS NOT NULL AND NEW.title != '' THEN
NEW.slug := generate_biography_slug(NEW.title);
END IF;
RETURN NEW;
END;
$$;


--
-- Name: set_next_chapter_available_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_next_chapter_available_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.translation_of IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.last_chapter_published_at IS NOT NULL
     AND (OLD.last_chapter_published_at IS DISTINCT FROM NEW.last_chapter_published_at)
  THEN
    NEW.next_chapter_available_at := NEW.last_chapter_published_at + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_moderation_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_moderation_reports_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_action_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_action_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    performed_by uuid NOT NULL,
    action_type text NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_memory_facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_memory_facts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    fact_type text NOT NULL,
    fact_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    role text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    tool_calls jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text, 'system'::text])))
);


--
-- Name: agent_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    biography_id uuid,
    agent_type text NOT NULL,
    locale character(2) DEFAULT 'en'::bpchar NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    rolling_summary text DEFAULT ''::text,
    message_count integer DEFAULT 0 NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_threads_agent_type_check CHECK ((agent_type = 'echo'::text)),
    CONSTRAINT agent_threads_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


--
-- Name: agent_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_usage (
    user_id uuid NOT NULL,
    usage_date date DEFAULT CURRENT_DATE NOT NULL,
    turn_count integer DEFAULT 0 NOT NULL
);


--
-- Name: ai_author_token_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_author_token_limits (
    id boolean DEFAULT true NOT NULL,
    daily_tokens bigint,
    weekly_tokens bigint,
    monthly_tokens bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_author_token_limits_daily_tokens_check CHECK (((daily_tokens IS NULL) OR (daily_tokens > 0))),
    CONSTRAINT ai_author_token_limits_id_check CHECK (id),
    CONSTRAINT ai_author_token_limits_monthly_tokens_check CHECK (((monthly_tokens IS NULL) OR (monthly_tokens > 0))),
    CONSTRAINT ai_author_token_limits_weekly_tokens_check CHECK (((weekly_tokens IS NULL) OR (weekly_tokens > 0)))
);


--
-- Name: ai_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    model_used text
);


--
-- Name: ai_token_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_token_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    biography_id uuid,
    purpose text NOT NULL,
    model text,
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    estimated boolean DEFAULT false NOT NULL,
    usage_unit text,
    usage_units numeric,
    ok boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_token_usage_completion_tokens_check CHECK (((completion_tokens IS NULL) OR (completion_tokens >= 0))),
    CONSTRAINT ai_token_usage_prompt_tokens_check CHECK (((prompt_tokens IS NULL) OR (prompt_tokens >= 0))),
    CONSTRAINT ai_token_usage_purpose_check CHECK ((purpose = ANY (ARRAY['echo'::text, 'grammar'::text, 'preprint_check'::text, 'screening'::text, 'embedding'::text, 'memory_compression'::text, 'transcription'::text, 'tts'::text]))),
    CONSTRAINT ai_token_usage_total_tokens_check CHECK (((total_tokens IS NULL) OR (total_tokens >= 0))),
    CONSTRAINT ai_token_usage_unit_pair CHECK (((usage_unit IS NULL) = (usage_units IS NULL))),
    CONSTRAINT ai_token_usage_usage_unit_check CHECK (((usage_unit IS NULL) OR (usage_unit = ANY (ARRAY['seconds'::text, 'characters'::text, 'bytes'::text])))),
    CONSTRAINT ai_token_usage_usage_units_check CHECK (((usage_units IS NULL) OR (usage_units >= (0)::numeric)))
);


--
-- Name: ai_usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_count integer DEFAULT 0 NOT NULL,
    weekly_count integer DEFAULT 0 NOT NULL,
    daily_reset_at timestamp with time zone DEFAULT date_trunc('day'::text, (now() AT TIME ZONE 'UTC'::text)) NOT NULL,
    weekly_reset_at timestamp with time zone DEFAULT date_trunc('week'::text, (now() AT TIME ZONE 'UTC'::text)) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analysis_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analysis_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    outcome jsonb,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT analysis_jobs_finished_when_terminal CHECK ((((status = 'running'::text) AND (finished_at IS NULL)) OR ((status <> 'running'::text) AND (finished_at IS NOT NULL)))),
    CONSTRAINT analysis_jobs_kind_check CHECK ((kind = ANY (ARRAY['screening'::text, 'preprint_check'::text]))),
    CONSTRAINT analysis_jobs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'done'::text, 'failed'::text, 'interrupted'::text])))
);


--
-- Name: archive_package_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archive_package_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    um_id text NOT NULL,
    version_number integer NOT NULL,
    generated_at timestamp with time zone NOT NULL,
    manifest_sha256 text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'stored'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT archive_package_versions_reason_check CHECK ((reason = ANY (ARRAY['publication'::text, 'provisional_expired'::text, 'republication'::text, 'data_protection'::text, 'edition_published'::text]))),
    CONSTRAINT archive_package_versions_status_check CHECK ((status = ANY (ARRAY['stored'::text, 'destroyed'::text]))),
    CONSTRAINT archive_package_versions_version_number_check CHECK ((version_number >= 1))
);


--
-- Name: biographies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biographies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    visibility text DEFAULT 'private'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    share_token text,
    completed_at timestamp with time zone,
    editor_font_size integer DEFAULT 16,
    final_version text DEFAULT ''::text,
    narrative_order jsonb DEFAULT '[]'::jsonb,
    published_at timestamp with time zone,
    author_name text DEFAULT ''::text NOT NULL,
    frozen_at timestamp with time zone,
    frozen_reason text,
    last_chapter_published_at timestamp with time zone,
    next_chapter_available_at timestamp with time zone,
    chapters_count integer DEFAULT 0 NOT NULL,
    linked_biography_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    featured_at timestamp with time zone,
    featured_by uuid,
    biography_mode text DEFAULT 'sections'::text NOT NULL,
    content_freeflow text,
    biography_type text DEFAULT 'autobiography'::text NOT NULL,
    slug text,
    ai_screening_status text DEFAULT 'pending'::text,
    pdf_draft_iteration integer,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    export_txt_url text,
    export_docx_url text,
    pdf_draft_started_at timestamp with time zone,
    final_pdf_approved_at timestamp with time zone,
    final_pdf_url text,
    listing_cover_url text,
    draft_ai_feedback jsonb,
    chapter_available_email_sent_at timestamp with time zone,
    pdf_draft_reminder_sent_at timestamp with time zone,
    subject_name text,
    um_id text,
    schema_version integer DEFAULT 2 NOT NULL,
    record_language_tag text NOT NULL,
    record_script text NOT NULL,
    record_direction text NOT NULL,
    record_language_endonym text,
    name_as_written text,
    name_given text,
    name_family text,
    name_order text,
    name_romanized text,
    romanization_system text,
    published_at_iso date,
    published_um_year integer,
    rights_statement_uri text,
    rights_chosen_at timestamp with time zone,
    rights_holder text,
    consent_basis text,
    consent_recorded_at timestamp with time zone,
    content_html_legacy jsonb,
    provisional_until timestamp with time zone,
    revised_at timestamp with time zone,
    is_pioneer boolean DEFAULT false NOT NULL,
    translation_of uuid,
    original_version_at timestamp with time zone,
    CONSTRAINT biographies_ai_screening_status_check CHECK ((ai_screening_status = ANY (ARRAY['pending'::text, 'passed'::text, 'flagged'::text, 'parse_error'::text, 'ai_error'::text]))),
    CONSTRAINT biographies_biography_mode_check CHECK ((biography_mode = ANY (ARRAY['sections'::text, 'freeflow'::text]))),
    CONSTRAINT biographies_biography_type_check CHECK ((biography_type = ANY (ARRAY['autobiography'::text, 'memorial'::text]))),
    CONSTRAINT biographies_consent_basis_check CHECK (((consent_basis IS NULL) OR (consent_basis = ANY (ARRAY['self'::text, 'family'::text, 'public-domain'::text, 'other'::text])))),
    CONSTRAINT biographies_editor_font_size_check CHECK (((editor_font_size >= 14) AND (editor_font_size <= 24))),
    CONSTRAINT biographies_frozen_reason_check CHECK ((frozen_reason = ANY (ARRAY['death'::text, 'admin_action'::text]))),
    CONSTRAINT biographies_name_order_check CHECK (((name_order IS NULL) OR (name_order = ANY (ARRAY['given-family'::text, 'family-given'::text, 'single'::text, 'other'::text])))),
    CONSTRAINT biographies_record_direction_check CHECK (((record_direction IS NULL) OR (record_direction = ANY (ARRAY['ltr'::text, 'rtl'::text])))),
    CONSTRAINT biographies_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sections_complete'::text, 'final_version'::text, 'pdf_draft'::text, 'locked_pending_screening'::text, 'under_review'::text, 'published'::text, 'removed'::text, 'suspended_pending_verification'::text, 'revision_requested'::text, 'revision_pending_review'::text, 'revision_overdue'::text]))),
    CONSTRAINT biographies_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'link-only'::text, 'public'::text])))
);


--
-- Name: biography_book_structure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_book_structure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    user_id uuid NOT NULL,
    dedication_content text,
    epigraph_content text,
    epigraph_source text,
    preface_content text,
    epilogue_content text,
    acknowledgements_content text,
    specific_credits_content text,
    dedication_enabled boolean DEFAULT false NOT NULL,
    epigraph_enabled boolean DEFAULT false NOT NULL,
    preface_enabled boolean DEFAULT false NOT NULL,
    epilogue_enabled boolean DEFAULT false NOT NULL,
    acknowledgements_enabled boolean DEFAULT false NOT NULL,
    specific_credits_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    include_author_copyright_page boolean DEFAULT false NOT NULL
);


--
-- Name: biography_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    section_key text,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    text_hash text NOT NULL,
    embedding public.vector(3584),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: biography_edition_captions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_edition_captions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    media_id uuid NOT NULL,
    caption text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: person_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    event_type text NOT NULL,
    event_label text NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    date_edtf text,
    date_as_given text,
    calendar_code text,
    calendar_label text,
    date_start_iso date,
    date_end_iso date,
    date_start_jdn integer GENERATED ALWAYS AS (
CASE
    WHEN (date_start_iso IS NULL) THEN NULL::integer
    ELSE ((date_start_iso - '2000-01-01'::date) + 2451545)
END) STORED,
    date_end_jdn integer GENERATED ALWAYS AS (
CASE
    WHEN (date_end_iso IS NULL) THEN NULL::integer
    ELSE ((date_end_iso - '2000-01-01'::date) + 2451545)
END) STORED,
    place_name_as_given text,
    place_name_current text,
    place_lat numeric(9,6),
    place_lon numeric(9,6),
    place_geonames_id integer,
    place_wikidata_qid text,
    asserted_by text,
    asserted_by_label text,
    source_note text,
    confidence text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT person_events_confidence_check CHECK (((confidence IS NULL) OR (confidence = ANY (ARRAY['certain'::text, 'probable'::text, 'uncertain'::text, 'unknown'::text]))))
);


--
-- Name: biography_flat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.biography_flat WITH (security_invoker='on') AS
 SELECT b.id,
    b.user_id,
    b.title,
    b.content,
    b.visibility,
    b.status,
    b.created_at,
    b.updated_at,
    b.share_token,
    b.completed_at,
    b.editor_font_size,
    b.final_version,
    b.narrative_order,
    b.published_at,
    b.author_name,
    b.frozen_at,
    b.frozen_reason,
    b.last_chapter_published_at,
    b.next_chapter_available_at,
    b.chapters_count,
    b.linked_biography_ids,
    b.is_frozen,
    b.view_count,
    b.is_featured,
    b.featured_at,
    b.featured_by,
    b.biography_mode,
    b.content_freeflow,
    b.biography_type,
    b.slug,
    b.ai_screening_status,
    b.pdf_draft_iteration,
    b.reviewed_by,
    b.reviewed_at,
    b.export_txt_url,
    b.export_docx_url,
    b.pdf_draft_started_at,
    b.final_pdf_approved_at,
    b.final_pdf_url,
    b.listing_cover_url,
    b.draft_ai_feedback,
    b.chapter_available_email_sent_at,
    b.pdf_draft_reminder_sent_at,
    b.subject_name,
    b.um_id,
    b.schema_version,
    b.record_language_tag,
    b.record_script,
    b.record_direction,
    b.translation_of,
    b.record_language_endonym,
    b.name_as_written,
    b.name_given,
    b.name_family,
    b.name_order,
    b.name_romanized,
    b.romanization_system,
    b.published_at_iso,
    b.published_um_year,
    b.rights_statement_uri,
    b.rights_chosen_at,
    b.rights_holder,
    b.consent_basis,
    b.consent_recorded_at,
    birth.date_edtf AS birth_date_edtf,
    birth.date_as_given AS birth_date_as_given,
    birth.date_start_iso AS birth_date_start_iso,
    birth.date_start_jdn AS birth_date_start_jdn,
    birth.place_name_as_given AS birth_place_as_given,
    birth.place_lat AS birth_place_lat,
    birth.place_lon AS birth_place_lon,
    death.date_edtf AS death_date_edtf,
    death.date_as_given AS death_date_as_given,
    death.date_start_iso AS death_date_start_iso,
    death.date_start_jdn AS death_date_start_jdn,
    death.place_name_as_given AS death_place_as_given,
    death.place_lat AS death_place_lat,
    death.place_lon AS death_place_lon
   FROM ((public.biographies b
     LEFT JOIN LATERAL ( SELECT e.id,
            e.biography_id,
            e.event_type,
            e.event_label,
            e.sequence,
            e.date_edtf,
            e.date_as_given,
            e.calendar_code,
            e.calendar_label,
            e.date_start_iso,
            e.date_end_iso,
            e.date_start_jdn,
            e.date_end_jdn,
            e.place_name_as_given,
            e.place_name_current,
            e.place_lat,
            e.place_lon,
            e.place_geonames_id,
            e.place_wikidata_qid,
            e.asserted_by,
            e.asserted_by_label,
            e.source_note,
            e.confidence,
            e.created_at
           FROM public.person_events e
          WHERE ((e.biography_id = b.id) AND (e.event_type = 'birth'::text))
          ORDER BY e.sequence, e.created_at
         LIMIT 1) birth ON (true))
     LEFT JOIN LATERAL ( SELECT e.id,
            e.biography_id,
            e.event_type,
            e.event_label,
            e.sequence,
            e.date_edtf,
            e.date_as_given,
            e.calendar_code,
            e.calendar_label,
            e.date_start_iso,
            e.date_end_iso,
            e.date_start_jdn,
            e.date_end_jdn,
            e.place_name_as_given,
            e.place_name_current,
            e.place_lat,
            e.place_lon,
            e.place_geonames_id,
            e.place_wikidata_qid,
            e.asserted_by,
            e.asserted_by_label,
            e.source_note,
            e.confidence,
            e.created_at
           FROM public.person_events e
          WHERE ((e.biography_id = b.id) AND (e.event_type = 'death'::text))
          ORDER BY e.sequence, e.created_at
         LIMIT 1) death ON (true));


--
-- Name: biography_host_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biography_host_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biography_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text,
    caption text DEFAULT ''::text,
    layout text DEFAULT 'full-page'::text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    width integer,
    height integer,
    bytes integer,
    original_bytes integer,
    CONSTRAINT biography_media_bytes_check CHECK (((bytes IS NULL) OR (bytes > 0))),
    CONSTRAINT biography_media_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT biography_media_layout_check CHECK ((layout = ANY (ARRAY['full-page'::text, 'cover'::text, 'cover_a5'::text, 'two-vertical'::text, 'two-horizontal'::text, 'three-mixed'::text]))),
    CONSTRAINT biography_media_original_bytes_check CHECK (((original_bytes IS NULL) OR (original_bytes > 0))),
    CONSTRAINT biography_media_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: biography_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    section_name text DEFAULT ''::text NOT NULL,
    content text DEFAULT ''::text,
    audio_transcript text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    status character varying(30) DEFAULT 'in_progress'::character varying,
    draft_version integer DEFAULT 1,
    approved_at timestamp with time zone,
    section_key text NOT NULL
);


--
-- Name: biography_source_html_legacy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biography_source_html_legacy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    source_column text NOT NULL,
    entry_id text,
    content text NOT NULL,
    converted_at timestamp with time zone DEFAULT now() NOT NULL,
    purge_after timestamp with time zone DEFAULT (now() + '180 days'::interval) NOT NULL
);


--
-- Name: conversation_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    biography_id uuid NOT NULL,
    section character varying(50) NOT NULL,
    conversation_log jsonb DEFAULT '[]'::jsonb NOT NULL,
    questions_completed integer DEFAULT 0,
    last_question text,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_follow_up boolean DEFAULT false,
    has_had_follow_up boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    level text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    url text,
    user_agent text,
    user_id uuid,
    source text,
    resolved boolean DEFAULT false NOT NULL
);


--
-- Name: kb_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locale character(2) DEFAULT 'en'::bpchar NOT NULL,
    source_key text NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    text_hash text NOT NULL,
    embedding public.vector(3584),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kb_index_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_index_state (
    locale text NOT NULL,
    version text NOT NULL,
    content_hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reseed_locked_until timestamp with time zone
);


--
-- Name: moderation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    message text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    reporter_id uuid,
    report_type text NOT NULL,
    description text,
    status text DEFAULT 'unassigned'::text NOT NULL,
    assigned_to uuid,
    ai_analysis jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_violation_level integer,
    decision text,
    decision_reason text,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_moderator_id uuid,
    assigned_at timestamp with time zone,
    moderator_notes jsonb,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    reporter_email text,
    reporter_name text,
    origin text,
    appeal_status text,
    appeal_submitted_at timestamp with time zone,
    appeal_decided_at timestamp with time zone,
    appeal_reason text,
    biography_status_before_decision text,
    receipt_sent_at timestamp with time zone,
    author_revision_requested_at timestamp with time zone,
    reviewer_reminder_7_sent_at timestamp with time zone,
    reviewer_reminder_21_sent_at timestamp with time zone,
    reviewer_reminder_28_sent_at timestamp with time zone,
    author_reminder_7_sent_at timestamp with time zone,
    author_reminder_25_sent_at timestamp with time zone,
    documentation_overdue_noted_at timestamp with time zone,
    reporter_pii_erased_at timestamp with time zone,
    CONSTRAINT moderation_reports_appeal_status_check CHECK (((appeal_status IS NULL) OR (appeal_status = ANY (ARRAY['pending'::text, 'upheld'::text, 'rejected'::text])))),
    CONSTRAINT moderation_reports_biography_status_before_decision_check CHECK (((biography_status_before_decision IS NULL) OR (biography_status_before_decision = ANY (ARRAY['draft'::text, 'sections_complete'::text, 'final_version'::text, 'pdf_draft'::text, 'locked_pending_screening'::text, 'under_review'::text, 'published'::text, 'removed'::text, 'suspended_pending_verification'::text, 'revision_requested'::text, 'revision_pending_review'::text, 'revision_overdue'::text])))),
    CONSTRAINT moderation_reports_decision_check CHECK ((decision = ANY (ARRAY['publish'::text, 'publish_warning'::text, 'returned'::text, 'removed'::text, 'hide'::text, 'remove'::text, 'request_edit'::text, 'no_action'::text]))),
    CONSTRAINT moderation_reports_origin_check CHECK (((origin IS NULL) OR (origin = ANY (ARRAY['in_app'::text, 'email_channel'::text, 'screening'::text])))),
    CONSTRAINT moderation_reports_report_type_check CHECK ((report_type = ANY (ARRAY['level1_content'::text, 'level2_content'::text, 'level3_content'::text, 'user_report'::text, 'living_person'::text, 'right_to_oblivion'::text, 'impersonation'::text, 'copyright'::text, 'other'::text, 'illegal_content'::text, 'sensitive_personal_data'::text, 'defamation'::text]))),
    CONSTRAINT moderation_reports_status_check CHECK ((status = ANY (ARRAY['unassigned'::text, 'assigned'::text, 'in_review'::text, 'decided'::text])))
);


--
-- Name: narrative_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.narrative_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    user_id uuid NOT NULL,
    original_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    selected_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    structure_type text DEFAULT 'chronological'::text,
    rationale text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: person_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    relation_code text,
    relation_label text NOT NULL,
    direction text DEFAULT 'from-subject'::text NOT NULL,
    related_um_id text,
    related_name_as_written text,
    related_name_romanized text,
    valid_from_edtf text,
    valid_to_edtf text,
    asserted_by text,
    asserted_by_label text,
    source_note text,
    confidence text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT person_relations_confidence_check CHECK (((confidence IS NULL) OR (confidence = ANY (ARRAY['certain'::text, 'probable'::text, 'uncertain'::text, 'unknown'::text]))))
);


--
-- Name: preprint_check_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprint_check_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    content_fingerprint text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preprint_check_runs_content_fingerprint_check CHECK ((content_fingerprint ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    language text DEFAULT 'en'::text NOT NULL,
    ui_font_size character varying(20) DEFAULT 'normal'::character varying,
    ai_features_enabled boolean DEFAULT false NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    account_status text DEFAULT 'waitlist'::text NOT NULL,
    language_confirmed_at timestamp with time zone,
    onboarding_phase text DEFAULT 'wizard'::text NOT NULL,
    onboarding_wizard_step text,
    onboarding_writing_path text,
    onboarding_skipped_at timestamp with time zone,
    onboarding_completed_at timestamp with time zone,
    legal_declaration_type text,
    legal_declaration_accepted_at timestamp with time zone,
    legal_declaration_version text DEFAULT '2026-06'::text,
    welcome_email_sent_at timestamp with time zone,
    waitlist_granted_at timestamp with time zone,
    CONSTRAINT profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'waitlist'::text]))),
    CONSTRAINT profiles_language_check CHECK ((language = ANY (ARRAY['en'::text, 'it'::text, 'fr'::text, 'de'::text]))),
    CONSTRAINT profiles_legal_declaration_type_check CHECK (((legal_declaration_type IS NULL) OR (legal_declaration_type = ANY (ARRAY['autobiography'::text, 'memorial'::text])))),
    CONSTRAINT profiles_onboarding_phase_check CHECK ((onboarding_phase = ANY (ARRAY['wizard'::text, 'tour'::text, 'completed'::text, 'skipped'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'reviewer'::text, 'admin'::text, 'super_admin'::text]))),
    CONSTRAINT profiles_ui_font_size_check CHECK (((ui_font_size)::text = ANY ((ARRAY['small'::character varying, 'normal'::character varying, 'large'::character varying, 'extra-large'::character varying])::text[])))
);


--
-- Name: publication_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publication_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    kind text NOT NULL,
    fingerprint text NOT NULL,
    verdict text,
    scope text,
    examined_chars integer,
    source_chars integer,
    mode text,
    actor_id uuid,
    screening_record_id uuid,
    screening_fingerprint text,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text,
    previous_record_id uuid,
    CONSTRAINT publication_records_examined_chars_check CHECK (((examined_chars IS NULL) OR (examined_chars >= 0))),
    CONSTRAINT publication_records_fingerprint_check CHECK ((fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT publication_records_kind_check CHECK ((kind = ANY (ARRAY['screening'::text, 'publication'::text]))),
    CONSTRAINT publication_records_mode_check CHECK (((mode IS NULL) OR (mode = ANY (ARRAY['auto'::text, 'human_approval'::text, 'restore'::text, 'forced'::text])))),
    CONSTRAINT publication_records_outcome_check CHECK (((outcome IS NULL) OR (outcome = ANY (ARRAY['pending'::text, 'published'::text, 'failed'::text])))),
    CONSTRAINT publication_records_publication_shape CHECK (((kind <> 'publication'::text) OR ((mode IS NOT NULL) AND (outcome IS NOT NULL) AND (verdict IS NULL)))),
    CONSTRAINT publication_records_scope_check CHECK (((scope IS NULL) OR (scope = ANY (ARRAY['full'::text, 'targeted'::text])))),
    CONSTRAINT publication_records_screening_fingerprint_check CHECK (((screening_fingerprint IS NULL) OR (screening_fingerprint ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT publication_records_screening_shape CHECK (((kind <> 'screening'::text) OR ((verdict IS NOT NULL) AND (scope IS NOT NULL) AND (examined_chars IS NOT NULL) AND (mode IS NULL)))),
    CONSTRAINT publication_records_source_chars_check CHECK (((source_chars IS NULL) OR (source_chars >= 0))),
    CONSTRAINT publication_records_verdict_check CHECK (((verdict IS NULL) OR (verdict = ANY (ARRAY['passed'::text, 'flagged'::text, 'ai_error'::text, 'parse_error'::text, 'text_changed'::text]))))
);


--
-- Name: reviewer_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviewer_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviewer_languages_language_code_check CHECK ((language_code = ANY (ARRAY['en'::text, 'it'::text, 'fr'::text, 'de'::text])))
);


--
-- Name: role_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    changed_by uuid NOT NULL,
    target_user uuid NOT NULL,
    old_role text NOT NULL,
    new_role text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    section_key text NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: section_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    section character varying(50) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    biography_id uuid NOT NULL,
    section character varying(50) NOT NULL,
    description text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: um_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.um_identifiers (
    um_id text NOT NULL,
    um_year integer NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    biography_id uuid
);


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_action_log admin_action_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_log
    ADD CONSTRAINT admin_action_log_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_facts agent_memory_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_facts
    ADD CONSTRAINT agent_memory_facts_pkey PRIMARY KEY (id);


--
-- Name: agent_messages agent_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_threads agent_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_threads
    ADD CONSTRAINT agent_threads_pkey PRIMARY KEY (id);


--
-- Name: agent_usage agent_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_usage
    ADD CONSTRAINT agent_usage_pkey PRIMARY KEY (user_id, usage_date);


--
-- Name: ai_author_token_limits ai_author_token_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_author_token_limits
    ADD CONSTRAINT ai_author_token_limits_pkey PRIMARY KEY (id);


--
-- Name: ai_rate_limits ai_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_rate_limits
    ADD CONSTRAINT ai_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: ai_token_usage ai_token_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_token_usage
    ADD CONSTRAINT ai_token_usage_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_tracking ai_usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_tracking
    ADD CONSTRAINT ai_usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_tracking ai_usage_tracking_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_tracking
    ADD CONSTRAINT ai_usage_tracking_user_id_key UNIQUE (user_id);


--
-- Name: analysis_jobs analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_jobs
    ADD CONSTRAINT analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: archive_package_versions archive_package_versions_biography_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archive_package_versions
    ADD CONSTRAINT archive_package_versions_biography_id_version_number_key UNIQUE (biography_id, version_number);


--
-- Name: archive_package_versions archive_package_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archive_package_versions
    ADD CONSTRAINT archive_package_versions_pkey PRIMARY KEY (id);


--
-- Name: biographies biographies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_pkey PRIMARY KEY (id);


--
-- Name: biographies biographies_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_share_token_key UNIQUE (share_token);


--
-- Name: biography_book_structure biography_book_structure_biography_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_book_structure
    ADD CONSTRAINT biography_book_structure_biography_id_key UNIQUE (biography_id);


--
-- Name: biography_book_structure biography_book_structure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_book_structure
    ADD CONSTRAINT biography_book_structure_pkey PRIMARY KEY (id);


--
-- Name: biography_chunks biography_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_chunks
    ADD CONSTRAINT biography_chunks_pkey PRIMARY KEY (id);


--
-- Name: biography_edition_captions biography_edition_captions_biography_id_media_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_edition_captions
    ADD CONSTRAINT biography_edition_captions_biography_id_media_id_key UNIQUE (biography_id, media_id);


--
-- Name: biography_edition_captions biography_edition_captions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_edition_captions
    ADD CONSTRAINT biography_edition_captions_pkey PRIMARY KEY (id);


--
-- Name: biography_media biography_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_media
    ADD CONSTRAINT biography_media_pkey PRIMARY KEY (id);


--
-- Name: biography_sections biography_sections_biography_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_sections
    ADD CONSTRAINT biography_sections_biography_id_section_key_key UNIQUE (biography_id, section_key);


--
-- Name: biography_sections biography_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_sections
    ADD CONSTRAINT biography_sections_pkey PRIMARY KEY (id);


--
-- Name: biography_source_html_legacy biography_source_html_legacy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_source_html_legacy
    ADD CONSTRAINT biography_source_html_legacy_pkey PRIMARY KEY (id);


--
-- Name: conversation_checkpoints conversation_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: kb_chunks kb_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chunks
    ADD CONSTRAINT kb_chunks_pkey PRIMARY KEY (id);


--
-- Name: kb_index_state kb_index_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_index_state
    ADD CONSTRAINT kb_index_state_pkey PRIMARY KEY (locale);


--
-- Name: moderation_messages moderation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_messages
    ADD CONSTRAINT moderation_messages_pkey PRIMARY KEY (id);


--
-- Name: moderation_reports moderation_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_pkey PRIMARY KEY (id);


--
-- Name: narrative_structures narrative_structures_biography_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_structures
    ADD CONSTRAINT narrative_structures_biography_id_key UNIQUE (biography_id);


--
-- Name: narrative_structures narrative_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_structures
    ADD CONSTRAINT narrative_structures_pkey PRIMARY KEY (id);


--
-- Name: person_events person_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_events
    ADD CONSTRAINT person_events_pkey PRIMARY KEY (id);


--
-- Name: person_relations person_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_relations
    ADD CONSTRAINT person_relations_pkey PRIMARY KEY (id);


--
-- Name: preprint_check_runs preprint_check_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprint_check_runs
    ADD CONSTRAINT preprint_check_runs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: publication_records publication_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_records
    ADD CONSTRAINT publication_records_pkey PRIMARY KEY (id);


--
-- Name: reviewer_languages reviewer_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewer_languages
    ADD CONSTRAINT reviewer_languages_pkey PRIMARY KEY (id);


--
-- Name: reviewer_languages reviewer_languages_user_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewer_languages
    ADD CONSTRAINT reviewer_languages_user_id_language_code_key UNIQUE (user_id, language_code);


--
-- Name: role_change_log role_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_change_log
    ADD CONSTRAINT role_change_log_pkey PRIMARY KEY (id);


--
-- Name: section_completions section_completions_biography_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_completions
    ADD CONSTRAINT section_completions_biography_id_section_key_key UNIQUE (biography_id, section_key);


--
-- Name: section_completions section_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_completions
    ADD CONSTRAINT section_completions_pkey PRIMARY KEY (id);


--
-- Name: section_notes section_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_notes
    ADD CONSTRAINT section_notes_pkey PRIMARY KEY (id);


--
-- Name: section_todos section_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_todos
    ADD CONSTRAINT section_todos_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: um_identifiers um_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.um_identifiers
    ADD CONSTRAINT um_identifiers_pkey PRIMARY KEY (um_id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_action_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_action_log_created_at_idx ON public.admin_action_log USING btree (created_at DESC);


--
-- Name: admin_action_log_performed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_action_log_performed_by_idx ON public.admin_action_log USING btree (performed_by);


--
-- Name: admin_action_log_target_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_action_log_target_id_idx ON public.admin_action_log USING btree (target_id);


--
-- Name: agent_memory_facts_thread_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_memory_facts_thread_id_idx ON public.agent_memory_facts USING btree (thread_id);


--
-- Name: agent_messages_thread_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_messages_thread_created_idx ON public.agent_messages USING btree (thread_id, created_at);


--
-- Name: agent_threads_bio_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_threads_bio_active ON public.agent_threads USING btree (user_id, biography_id, agent_type) WHERE ((status = 'active'::text) AND (biography_id IS NOT NULL));


--
-- Name: agent_threads_biography_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_threads_biography_id_idx ON public.agent_threads USING btree (biography_id) WHERE (biography_id IS NOT NULL);


--
-- Name: agent_threads_platform_guide_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_threads_platform_guide_active ON public.agent_threads USING btree (user_id, agent_type) WHERE ((status = 'active'::text) AND (biography_id IS NULL));


--
-- Name: agent_threads_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_threads_user_id_idx ON public.agent_threads USING btree (user_id);


--
-- Name: ai_token_usage_purpose_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_token_usage_purpose_created_idx ON public.ai_token_usage USING btree (purpose, created_at DESC);


--
-- Name: ai_token_usage_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_token_usage_user_created_idx ON public.ai_token_usage USING btree (user_id, created_at DESC);


--
-- Name: analysis_jobs_biography_kind_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analysis_jobs_biography_kind_started_idx ON public.analysis_jobs USING btree (biography_id, kind, started_at DESC);


--
-- Name: analysis_jobs_one_running_per_bio_kind_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX analysis_jobs_one_running_per_bio_kind_uidx ON public.analysis_jobs USING btree (biography_id, kind) WHERE (status = 'running'::text);


--
-- Name: biographies_one_language_per_work; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX biographies_one_language_per_work ON public.biographies USING btree (COALESCE(translation_of, id), record_language_tag);


--
-- Name: biographies_record_language_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biographies_record_language_tag_idx ON public.biographies USING btree (record_language_tag);


--
-- Name: biographies_slug_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX biographies_slug_unique_idx ON public.biographies USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: biographies_translation_of_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biographies_translation_of_idx ON public.biographies USING btree (translation_of) WHERE (translation_of IS NOT NULL);


--
-- Name: biographies_um_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX biographies_um_id_unique_idx ON public.biographies USING btree (um_id) WHERE (um_id IS NOT NULL);


--
-- Name: biography_chunks_biography_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biography_chunks_biography_id_idx ON public.biography_chunks USING btree (biography_id);


--
-- Name: biography_chunks_unique_chunk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX biography_chunks_unique_chunk_idx ON public.biography_chunks USING btree (biography_id, section_key, chunk_index);


--
-- Name: biography_source_html_legacy_biography_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biography_source_html_legacy_biography_id_idx ON public.biography_source_html_legacy USING btree (biography_id);


--
-- Name: biography_source_html_legacy_purge_after_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biography_source_html_legacy_purge_after_idx ON public.biography_source_html_legacy USING btree (purge_after);


--
-- Name: biography_source_html_legacy_source_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX biography_source_html_legacy_source_uidx ON public.biography_source_html_legacy USING btree (biography_id, source_column, COALESCE(entry_id, ''::text));


--
-- Name: idx_ai_rate_limits_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_rate_limits_user_created ON public.ai_rate_limits USING btree (user_id, created_at DESC);


--
-- Name: idx_ai_usage_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_tracking_user_id ON public.ai_usage_tracking USING btree (user_id);


--
-- Name: idx_biographies_featured_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biographies_featured_by ON public.biographies USING btree (featured_by);


--
-- Name: idx_biographies_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biographies_user_status ON public.biographies USING btree (user_id, status);


--
-- Name: idx_biography_media_biography_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biography_media_biography_id ON public.biography_media USING btree (biography_id);


--
-- Name: idx_biography_media_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biography_media_user_id ON public.biography_media USING btree (user_id);


--
-- Name: idx_checkpoints_bio_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkpoints_bio_section ON public.conversation_checkpoints USING btree (biography_id, section);


--
-- Name: idx_checkpoints_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkpoints_user ON public.conversation_checkpoints USING btree (user_id);


--
-- Name: idx_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_created_at ON public.error_logs USING btree (created_at DESC);


--
-- Name: idx_error_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_level ON public.error_logs USING btree (level);


--
-- Name: idx_error_logs_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_resolved ON public.error_logs USING btree (resolved);


--
-- Name: idx_moderation_messages_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_messages_recipient_id ON public.moderation_messages USING btree (recipient_id);


--
-- Name: idx_moderation_messages_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_messages_report_id ON public.moderation_messages USING btree (report_id);


--
-- Name: idx_moderation_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_messages_sender_id ON public.moderation_messages USING btree (sender_id);


--
-- Name: idx_moderation_reports_assigned_moderator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reports_assigned_moderator ON public.moderation_reports USING btree (assigned_moderator_id) WHERE (assigned_moderator_id IS NOT NULL);


--
-- Name: idx_moderation_reports_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reports_assigned_to ON public.moderation_reports USING btree (assigned_to);


--
-- Name: idx_moderation_reports_biography_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reports_biography_id ON public.moderation_reports USING btree (biography_id);


--
-- Name: idx_moderation_reports_decided_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reports_decided_by ON public.moderation_reports USING btree (decided_by);


--
-- Name: idx_moderation_reports_reporter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_reports_reporter_id ON public.moderation_reports USING btree (reporter_id);


--
-- Name: idx_profiles_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status) WHERE (account_status <> 'active'::text);


--
-- Name: idx_profiles_waitlist_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_waitlist_created ON public.profiles USING btree (created_at) WHERE (account_status = 'waitlist'::text);


--
-- Name: idx_reviewer_languages_assigned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviewer_languages_assigned_by ON public.reviewer_languages USING btree (assigned_by);


--
-- Name: idx_role_change_log_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_change_log_changed_at ON public.role_change_log USING btree (changed_at DESC);


--
-- Name: idx_role_change_log_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_change_log_changed_by ON public.role_change_log USING btree (changed_by);


--
-- Name: idx_role_change_log_target_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_change_log_target_user ON public.role_change_log USING btree (target_user);


--
-- Name: idx_section_notes_biography_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_notes_biography_id ON public.section_notes USING btree (biography_id);


--
-- Name: idx_section_notes_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_notes_section ON public.section_notes USING btree (section);


--
-- Name: idx_section_todos_biography_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_todos_biography_id ON public.section_todos USING btree (biography_id);


--
-- Name: idx_section_todos_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_todos_section ON public.section_todos USING btree (section);


--
-- Name: idx_user_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_unread ON public.user_notifications USING btree (user_id, is_read);


--
-- Name: kb_chunks_locale_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kb_chunks_locale_idx ON public.kb_chunks USING btree (locale);


--
-- Name: kb_chunks_locale_source_chunk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kb_chunks_locale_source_chunk_idx ON public.kb_chunks USING btree (locale, source_key, chunk_index);


--
-- Name: person_events_biography_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_events_biography_idx ON public.person_events USING btree (biography_id);


--
-- Name: person_events_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_events_type_idx ON public.person_events USING btree (event_type);


--
-- Name: person_relations_biography_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX person_relations_biography_idx ON public.person_relations USING btree (biography_id);


--
-- Name: preprint_check_runs_biography_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX preprint_check_runs_biography_created_idx ON public.preprint_check_runs USING btree (biography_id, created_at DESC);


--
-- Name: preprint_check_runs_biography_fingerprint_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX preprint_check_runs_biography_fingerprint_uidx ON public.preprint_check_runs USING btree (biography_id, content_fingerprint);


--
-- Name: publication_records_biography_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publication_records_biography_created_idx ON public.publication_records USING btree (biography_id, created_at DESC);


--
-- Name: publication_records_biography_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publication_records_biography_kind_idx ON public.publication_records USING btree (biography_id, kind, created_at DESC);


--
-- Name: publication_records_previous_record_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX publication_records_previous_record_id_idx ON public.publication_records USING btree (previous_record_id) WHERE (previous_record_id IS NOT NULL);


--
-- Name: um_identifiers_biography_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX um_identifiers_biography_idx ON public.um_identifiers USING btree (biography_id) WHERE (biography_id IS NOT NULL);


--
-- Name: um_identifiers_issued_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX um_identifiers_issued_at_idx ON public.um_identifiers USING btree (issued_at);


--
-- Name: biographies a00_biographies_guard_server_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a00_biographies_guard_server_columns BEFORE INSERT OR UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_guard_server_columns();


--
-- Name: profiles a00_profiles_guard_server_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a00_profiles_guard_server_columns BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_server_columns();


--
-- Name: biographies a01_biographies_guard_author_text; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_biographies_guard_author_text BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_guard_author_text();


--
-- Name: biography_book_structure a01_biography_book_structure_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_biography_book_structure_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.biography_book_structure FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: biography_edition_captions a01_biography_edition_captions_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_biography_edition_captions_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.biography_edition_captions FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: biography_media a01_biography_media_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_biography_media_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.biography_media FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: biography_sections a01_biography_sections_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_biography_sections_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.biography_sections FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: person_events a01_person_events_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_person_events_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.person_events FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: person_relations a01_person_relations_guard_parent_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER a01_person_relations_guard_parent_status BEFORE INSERT OR DELETE OR UPDATE ON public.person_relations FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();


--
-- Name: biographies biographies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER biographies_updated_at BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: biography_media enforce_biography_media_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_biography_media_limit BEFORE INSERT ON public.biography_media FOR EACH ROW EXECUTE FUNCTION public.check_biography_media_limit();


--
-- Name: biographies trg_biographies_edition_rules; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_edition_rules BEFORE INSERT OR UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_edition_rules();


--
-- Name: biographies trg_biographies_edition_visibility_rights_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_edition_visibility_rights_immutable BEFORE UPDATE OF visibility, rights_statement_uri, rights_chosen_at, rights_holder ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_edition_visibility_rights_immutable();


--
-- Name: biographies trg_biographies_keep_pioneer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_keep_pioneer BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_keep_pioneer();


--
-- Name: biographies trg_biographies_mark_pioneer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_mark_pioneer BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_mark_pioneer();


--
-- Name: biographies trg_biographies_require_rights_for_public; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_require_rights_for_public BEFORE INSERT OR UPDATE OF visibility, rights_statement_uri ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_require_rights_for_public();


--
-- Name: biographies trg_biographies_sync_edition_visibility_rights; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_sync_edition_visibility_rights AFTER UPDATE OF visibility, rights_statement_uri, rights_chosen_at, rights_holder ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_sync_edition_visibility_rights();


--
-- Name: biographies trg_biographies_sync_published_um; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_sync_published_um BEFORE INSERT OR UPDATE OF published_at ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_sync_published_um();


--
-- Name: biographies trg_biographies_um_id_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biographies_um_id_immutable BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.biographies_um_id_immutable();


--
-- Name: biography_edition_captions trg_biography_edition_captions_media_on_original; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_biography_edition_captions_media_on_original BEFORE INSERT OR UPDATE OF media_id, biography_id ON public.biography_edition_captions FOR EACH ROW EXECUTE FUNCTION public.edition_caption_media_on_original();


--
-- Name: biographies trg_enforce_one_biography_per_user; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_one_biography_per_user BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.enforce_one_biography_per_user();


--
-- Name: biographies trg_handle_biography_published; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_handle_biography_published BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.handle_biography_published();


--
-- Name: moderation_reports trg_moderation_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_moderation_reports_updated_at BEFORE UPDATE ON public.moderation_reports FOR EACH ROW EXECUTE FUNCTION public.update_moderation_reports_updated_at();


--
-- Name: person_events trg_person_events_original_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_person_events_original_only BEFORE INSERT OR UPDATE ON public.person_events FOR EACH ROW EXECUTE FUNCTION public.reject_life_facts_on_edition();


--
-- Name: person_relations trg_person_relations_original_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_person_relations_original_only BEFORE INSERT OR UPDATE ON public.person_relations FOR EACH ROW EXECUTE FUNCTION public.reject_life_facts_on_edition();


--
-- Name: biographies trg_reset_biography_engagement_email_flags; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reset_biography_engagement_email_flags BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.reset_biography_engagement_email_flags();


--
-- Name: biographies trg_set_biography_slug; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_biography_slug BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.set_biography_slug();


--
-- Name: biographies trg_set_next_chapter_available_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_next_chapter_available_at BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION public.set_next_chapter_available_at();


--
-- Name: admin_action_log admin_action_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_log
    ADD CONSTRAINT admin_action_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: agent_memory_facts agent_memory_facts_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_memory_facts
    ADD CONSTRAINT agent_memory_facts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.agent_threads(id) ON DELETE CASCADE;


--
-- Name: agent_messages agent_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.agent_threads(id) ON DELETE CASCADE;


--
-- Name: agent_threads agent_threads_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_threads
    ADD CONSTRAINT agent_threads_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: agent_threads agent_threads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_threads
    ADD CONSTRAINT agent_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agent_usage agent_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_usage
    ADD CONSTRAINT agent_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_rate_limits ai_rate_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_rate_limits
    ADD CONSTRAINT ai_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_token_usage ai_token_usage_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_token_usage
    ADD CONSTRAINT ai_token_usage_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE SET NULL;


--
-- Name: ai_token_usage ai_token_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_token_usage
    ADD CONSTRAINT ai_token_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_usage_tracking ai_usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_tracking
    ADD CONSTRAINT ai_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: analysis_jobs analysis_jobs_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_jobs
    ADD CONSTRAINT analysis_jobs_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: archive_package_versions archive_package_versions_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archive_package_versions
    ADD CONSTRAINT archive_package_versions_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biographies biographies_featured_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_featured_by_fkey FOREIGN KEY (featured_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: biographies biographies_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: biographies biographies_translation_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_translation_of_fkey FOREIGN KEY (translation_of) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biographies biographies_um_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_um_id_fkey FOREIGN KEY (um_id) REFERENCES public.um_identifiers(um_id);


--
-- Name: biographies biographies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biographies
    ADD CONSTRAINT biographies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: biography_book_structure biography_book_structure_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_book_structure
    ADD CONSTRAINT biography_book_structure_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biography_book_structure biography_book_structure_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_book_structure
    ADD CONSTRAINT biography_book_structure_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: biography_chunks biography_chunks_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_chunks
    ADD CONSTRAINT biography_chunks_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biography_edition_captions biography_edition_captions_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_edition_captions
    ADD CONSTRAINT biography_edition_captions_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biography_edition_captions biography_edition_captions_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_edition_captions
    ADD CONSTRAINT biography_edition_captions_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.biography_media(id) ON DELETE CASCADE;


--
-- Name: biography_media biography_media_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_media
    ADD CONSTRAINT biography_media_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biography_media biography_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_media
    ADD CONSTRAINT biography_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: biography_sections biography_sections_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_sections
    ADD CONSTRAINT biography_sections_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: biography_source_html_legacy biography_source_html_legacy_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biography_source_html_legacy
    ADD CONSTRAINT biography_source_html_legacy_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: conversation_checkpoints conversation_checkpoints_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: conversation_checkpoints conversation_checkpoints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: moderation_messages moderation_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_messages
    ADD CONSTRAINT moderation_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: moderation_messages moderation_messages_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_messages
    ADD CONSTRAINT moderation_messages_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.moderation_reports(id) ON DELETE CASCADE;


--
-- Name: moderation_messages moderation_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_messages
    ADD CONSTRAINT moderation_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: moderation_reports moderation_reports_assigned_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_assigned_moderator_id_fkey FOREIGN KEY (assigned_moderator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: moderation_reports moderation_reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: moderation_reports moderation_reports_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: moderation_reports moderation_reports_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: moderation_reports moderation_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: moderation_reports moderation_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reports
    ADD CONSTRAINT moderation_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: narrative_structures narrative_structures_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_structures
    ADD CONSTRAINT narrative_structures_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: narrative_structures narrative_structures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_structures
    ADD CONSTRAINT narrative_structures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: person_events person_events_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_events
    ADD CONSTRAINT person_events_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: person_relations person_relations_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_relations
    ADD CONSTRAINT person_relations_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: preprint_check_runs preprint_check_runs_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprint_check_runs
    ADD CONSTRAINT preprint_check_runs_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: publication_records publication_records_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_records
    ADD CONSTRAINT publication_records_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: publication_records publication_records_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_records
    ADD CONSTRAINT publication_records_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: publication_records publication_records_previous_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_records
    ADD CONSTRAINT publication_records_previous_record_id_fkey FOREIGN KEY (previous_record_id) REFERENCES public.publication_records(id) ON DELETE SET NULL;


--
-- Name: publication_records publication_records_screening_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publication_records
    ADD CONSTRAINT publication_records_screening_record_id_fkey FOREIGN KEY (screening_record_id) REFERENCES public.publication_records(id) ON DELETE SET NULL;


--
-- Name: reviewer_languages reviewer_languages_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewer_languages
    ADD CONSTRAINT reviewer_languages_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id);


--
-- Name: reviewer_languages reviewer_languages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewer_languages
    ADD CONSTRAINT reviewer_languages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: role_change_log role_change_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_change_log
    ADD CONSTRAINT role_change_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: role_change_log role_change_log_target_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_change_log
    ADD CONSTRAINT role_change_log_target_user_fkey FOREIGN KEY (target_user) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: section_completions section_completions_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_completions
    ADD CONSTRAINT section_completions_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: section_completions section_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_completions
    ADD CONSTRAINT section_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: section_notes section_notes_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_notes
    ADD CONSTRAINT section_notes_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: section_todos section_todos_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_todos
    ADD CONSTRAINT section_todos_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE CASCADE;


--
-- Name: site_settings site_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: um_identifiers um_identifiers_biography_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.um_identifiers
    ADD CONSTRAINT um_identifiers_biography_id_fkey FOREIGN KEY (biography_id) REFERENCES public.biographies(id) ON DELETE SET NULL;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reviewer_languages Admins can delete language assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete language assignments" ON public.reviewer_languages FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: reviewer_languages Admins can insert language assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert language assignments" ON public.reviewer_languages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: profiles Admins can read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = id) OR (public.get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]))));


--
-- Name: moderation_messages Any authenticated user can send a message; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Any authenticated user can send a message" ON public.moderation_messages FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = sender_id));


--
-- Name: ai_usage_tracking Authenticated users can read own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read own usage" ON public.ai_usage_tracking FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: biographies Biographies: owner or public access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Biographies: owner or public access" ON public.biographies FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))))) OR ((status <> 'removed'::text) AND (((user_id = ( SELECT auth.uid() AS uid)) AND (public.get_my_account_status() = 'active'::text)) OR public.biography_public_read_allowed(id)))));


--
-- Name: biographies Biographies: owner or staff can update, blocked if frozen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Biographies: owner or staff can update, blocked if frozen" ON public.biographies FOR UPDATE TO authenticated USING ((((user_id = ( SELECT auth.uid() AS uid)) AND (NOT is_frozen) AND (public.get_my_account_status() = 'active'::text)) OR (public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])))) WITH CHECK ((((user_id = ( SELECT auth.uid() AS uid)) AND (NOT is_frozen) AND (public.get_my_account_status() = 'active'::text)) OR (public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: biography_edition_captions Edition captions: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edition captions: owner delete" ON public.biography_edition_captions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = biography_edition_captions.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false) AND (public.get_my_account_status() = 'active'::text)))));


--
-- Name: biography_edition_captions Edition captions: owner or staff read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edition captions: owner or staff read" ON public.biography_edition_captions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = biography_edition_captions.biography_id) AND (((b.user_id = ( SELECT auth.uid() AS uid)) AND (public.get_my_account_status() = 'active'::text)) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))))))))));


--
-- Name: biography_edition_captions Edition captions: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edition captions: owner update" ON public.biography_edition_captions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = biography_edition_captions.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (b.translation_of IS NOT NULL) AND (COALESCE(b.is_frozen, false) = false) AND (public.get_my_account_status() = 'active'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = biography_edition_captions.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (b.translation_of IS NOT NULL) AND (COALESCE(b.is_frozen, false) = false) AND (public.get_my_account_status() = 'active'::text)))));


--
-- Name: biography_edition_captions Edition captions: owner write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edition captions: owner write" ON public.biography_edition_captions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = biography_edition_captions.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (b.translation_of IS NOT NULL) AND (COALESCE(b.is_frozen, false) = false) AND (public.get_my_account_status() = 'active'::text)))));


--
-- Name: biography_edition_captions Edition captions: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Edition captions: public read" ON public.biography_edition_captions FOR SELECT TO authenticated, anon USING (public.biography_public_read_allowed(biography_id));


--
-- Name: moderation_messages Internal messages visible to staff only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Internal messages visible to staff only" ON public.moderation_messages FOR SELECT TO authenticated USING (
CASE
    WHEN (is_internal = true) THEN (public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))
    ELSE ((public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])) OR (EXISTS ( SELECT 1
       FROM (public.moderation_reports mr
         JOIN public.biographies b ON ((b.id = mr.biography_id)))
      WHERE ((mr.id = moderation_messages.report_id) AND (b.user_id = ( SELECT auth.uid() AS uid))))))
END);


--
-- Name: biographies Public read for published biographies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read for published biographies" ON public.biographies FOR SELECT TO anon USING (public.biography_public_read_allowed(id));


--
-- Name: moderation_reports Reporters see own reports; staff see all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reporters see own reports; staff see all" ON public.moderation_reports FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = reporter_id) OR (public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: admin_action_log Staff can insert own actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert own actions" ON public.admin_action_log FOR INSERT TO authenticated WITH CHECK (((performed_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])))))));


--
-- Name: admin_action_log Staff can read action log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read action log" ON public.admin_action_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: ai_rate_limits Staff can read all ai_rate_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read all ai_rate_limits" ON public.ai_rate_limits FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: moderation_reports Staff can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update reports" ON public.moderation_reports FOR UPDATE TO authenticated USING ((public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))) WITH CHECK ((public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])));


--
-- Name: ai_author_token_limits Staff read ai token limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read ai token limits" ON public.ai_author_token_limits FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])));


--
-- Name: ai_token_usage Staff read all ai usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read all ai usage" ON public.ai_token_usage FOR SELECT TO authenticated USING ((public.get_my_role() = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])));


--
-- Name: role_change_log Super admins can insert role change log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can insert role change log" ON public.role_change_log FOR INSERT TO authenticated WITH CHECK ((public.get_my_role() = 'super_admin'::text));


--
-- Name: role_change_log Super admins can read role change log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can read role change log" ON public.role_change_log FOR SELECT TO authenticated USING ((public.get_my_role() = 'super_admin'::text));


--
-- Name: biographies Users can delete own biographies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own biographies" ON public.biographies FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (public.get_my_account_status() = 'active'::text)));


--
-- Name: biography_sections Users can delete own biography sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own biography sections" ON public.biography_sections FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies
  WHERE ((biographies.id = biography_sections.biography_id) AND (biographies.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: biography_book_structure Users can delete own book structure; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own book structure" ON public.biography_book_structure FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: conversation_checkpoints Users can delete own checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own checkpoints" ON public.conversation_checkpoints FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: biography_media Users can delete own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own media" ON public.biography_media FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: narrative_structures Users can delete own narrative structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own narrative structures" ON public.narrative_structures FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.user_notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: section_completions Users can delete own section completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own section completions" ON public.section_completions FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: section_notes Users can delete own section notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own section notes" ON public.section_notes FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_notes.biography_id))));


--
-- Name: section_todos Users can delete own section todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own section todos" ON public.section_todos FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_todos.biography_id))));


--
-- Name: biographies Users can insert own biographies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own biographies" ON public.biographies FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (public.get_my_account_status() = 'active'::text)));


--
-- Name: biography_sections Users can insert own biography sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own biography sections" ON public.biography_sections FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies
  WHERE ((biographies.id = biography_sections.biography_id) AND (biographies.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: biography_book_structure Users can insert own book structure; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own book structure" ON public.biography_book_structure FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_checkpoints Users can insert own checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own checkpoints" ON public.conversation_checkpoints FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: biography_media Users can insert own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own media" ON public.biography_media FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: narrative_structures Users can insert own narrative structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own narrative structures" ON public.narrative_structures FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_notifications Users can insert own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notifications" ON public.user_notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_rate_limits Users can insert own rate limit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own rate limit records" ON public.ai_rate_limits FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: section_completions Users can insert own section completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own section completions" ON public.section_completions FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: section_notes Users can insert own section notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own section notes" ON public.section_notes FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_notes.biography_id))));


--
-- Name: section_todos Users can insert own section todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own section todos" ON public.section_todos FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_todos.biography_id))));


--
-- Name: biography_sections Users can read own biography sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own biography sections" ON public.biography_sections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies
  WHERE ((biographies.id = biography_sections.biography_id) AND (biographies.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: ai_rate_limits Users can read own rate limit records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own rate limit records" ON public.ai_rate_limits FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: biography_book_structure Users can select own book structure; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select own book structure" ON public.biography_book_structure FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: biography_sections Users can update own biography sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own biography sections" ON public.biography_sections FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies
  WHERE ((biographies.id = biography_sections.biography_id) AND (biographies.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies
  WHERE ((biographies.id = biography_sections.biography_id) AND (biographies.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: biography_book_structure Users can update own book structure; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own book structure" ON public.biography_book_structure FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_checkpoints Users can update own checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own checkpoints" ON public.conversation_checkpoints FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: biography_media Users can update own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own media" ON public.biography_media FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: narrative_structures Users can update own narrative structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own narrative structures" ON public.narrative_structures FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));


--
-- Name: section_completions Users can update own section completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own section completions" ON public.section_completions FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: section_notes Users can update own section notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own section notes" ON public.section_notes FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_notes.biography_id)))) WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_notes.biography_id))));


--
-- Name: section_todos Users can update own section todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own section todos" ON public.section_todos FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_todos.biography_id)))) WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_todos.biography_id))));


--
-- Name: conversation_checkpoints Users can view own checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own checkpoints" ON public.conversation_checkpoints FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: reviewer_languages Users can view own language assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own language assignments" ON public.reviewer_languages FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: biography_media Users can view own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own media" ON public.biography_media FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: narrative_structures Users can view own narrative structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own narrative structures" ON public.narrative_structures FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: section_completions Users can view own section completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own section completions" ON public.section_completions FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: section_notes Users can view own section notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own section notes" ON public.section_notes FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_notes.biography_id))));


--
-- Name: section_todos Users can view own section todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own section todos" ON public.section_todos FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT biographies.user_id
   FROM public.biographies
  WHERE (biographies.id = section_todos.biography_id))));


--
-- Name: ai_token_usage Users read own ai usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own ai usage" ON public.ai_token_usage FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: admin_action_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_facts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_memory_facts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_memory_facts agent_memory_facts_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_memory_facts_deny_all ON public.agent_memory_facts USING (false);


--
-- Name: agent_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_messages agent_messages_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_messages_deny_all ON public.agent_messages USING (false);


--
-- Name: agent_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_threads agent_threads_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_threads_deny_all ON public.agent_threads USING (false);


--
-- Name: agent_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_usage agent_usage_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agent_usage_deny_all ON public.agent_usage USING (false);


--
-- Name: ai_author_token_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_author_token_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_token_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings anon_authenticated_read_maintenance_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_authenticated_read_maintenance_only ON public.site_settings FOR SELECT TO authenticated, anon USING ((key = 'maintenance'::text));


--
-- Name: archive_package_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.archive_package_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: biographies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biographies ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_book_structure; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_book_structure ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_chunks biography_chunks_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY biography_chunks_deny_all ON public.biography_chunks USING (false);


--
-- Name: biography_edition_captions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_edition_captions ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_media ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: biography_source_html_legacy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biography_source_html_legacy ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_chunks kb_chunks_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kb_chunks_deny_all ON public.kb_chunks USING (false);


--
-- Name: kb_index_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_index_state ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_index_state kb_index_state_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kb_index_state_deny_all ON public.kb_index_state USING (false);


--
-- Name: moderation_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: narrative_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.narrative_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: person_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.person_events ENABLE ROW LEVEL SECURITY;

--
-- Name: person_events person_events: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_events: owner delete" ON public.person_events FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_events.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_events person_events: owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_events: owner insert" ON public.person_events FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_events.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_events person_events: owner select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_events: owner select" ON public.person_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_events.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: person_events person_events: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_events: owner update" ON public.person_events FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_events.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_events.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_events person_events: public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_events: public select" ON public.person_events FOR SELECT TO authenticated, anon USING (public.biography_public_read_allowed(biography_id));


--
-- Name: person_relations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.person_relations ENABLE ROW LEVEL SECURITY;

--
-- Name: person_relations person_relations: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_relations: owner delete" ON public.person_relations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_relations.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_relations person_relations: owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_relations: owner insert" ON public.person_relations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_relations.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_relations person_relations: owner select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_relations: owner select" ON public.person_relations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_relations.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: person_relations person_relations: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_relations: owner update" ON public.person_relations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_relations.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.biographies b
  WHERE ((b.id = person_relations.biography_id) AND (b.user_id = ( SELECT auth.uid() AS uid)) AND (COALESCE(b.is_frozen, false) = false)))));


--
-- Name: person_relations person_relations: public select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "person_relations: public select" ON public.person_relations FOR SELECT TO authenticated, anon USING (public.biography_public_read_allowed(biography_id));


--
-- Name: preprint_check_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preprint_check_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: publication_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.publication_records ENABLE ROW LEVEL SECURITY;

--
-- Name: reviewer_languages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviewer_languages ENABLE ROW LEVEL SECURITY;

--
-- Name: role_change_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: section_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: section_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: section_todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_todos ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: um_identifiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.um_identifiers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION ai_author_token_usage(p_user_id uuid, p_now timestamp with time zone, p_purposes text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.ai_author_token_usage(p_user_id uuid, p_now timestamp with time zone, p_purposes text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ai_author_token_usage(p_user_id uuid, p_now timestamp with time zone, p_purposes text[]) TO service_role;


--
-- Name: FUNCTION author_text_child_guard(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.author_text_child_guard() FROM PUBLIC;
GRANT ALL ON FUNCTION public.author_text_child_guard() TO service_role;


--
-- Name: FUNCTION author_text_writable_statuses(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.author_text_writable_statuses() FROM PUBLIC;
GRANT ALL ON FUNCTION public.author_text_writable_statuses() TO authenticated;
GRANT ALL ON FUNCTION public.author_text_writable_statuses() TO service_role;


--
-- Name: FUNCTION biographies_author_text_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_author_text_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_author_text_columns() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_author_text_columns() TO service_role;


--
-- Name: FUNCTION biographies_edition_rules(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_edition_rules() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_edition_rules() TO service_role;


--
-- Name: FUNCTION biographies_edition_visibility_rights_immutable(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_edition_visibility_rights_immutable() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_edition_visibility_rights_immutable() TO service_role;


--
-- Name: FUNCTION biographies_guard_author_text(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_guard_author_text() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_guard_author_text() TO service_role;


--
-- Name: FUNCTION biographies_guard_server_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_guard_server_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_guard_server_columns() TO service_role;


--
-- Name: FUNCTION biographies_insert_defaults(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_insert_defaults() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_insert_defaults() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_insert_defaults() TO service_role;


--
-- Name: FUNCTION biographies_keep_pioneer(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.biographies_keep_pioneer() TO anon;
GRANT ALL ON FUNCTION public.biographies_keep_pioneer() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_keep_pioneer() TO service_role;


--
-- Name: FUNCTION biographies_mark_pioneer(); Type: ACL; Schema: public; Owner: -
--

-- Solo trigger: niente EXECUTE per anon/authenticated (20261024100000).
GRANT ALL ON FUNCTION public.biographies_mark_pioneer() TO service_role;


--
-- Name: FUNCTION biographies_require_rights_for_public(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.biographies_require_rights_for_public() TO anon;
GRANT ALL ON FUNCTION public.biographies_require_rights_for_public() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_require_rights_for_public() TO service_role;


--
-- Name: FUNCTION biographies_server_owned_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_server_owned_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_server_owned_columns() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_server_owned_columns() TO service_role;


--
-- Name: FUNCTION biographies_sync_edition_visibility_rights(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biographies_sync_edition_visibility_rights() FROM PUBLIC;
GRANT ALL ON FUNCTION public.biographies_sync_edition_visibility_rights() TO service_role;


--
-- Name: FUNCTION biographies_sync_published_um(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.biographies_sync_published_um() TO anon;
GRANT ALL ON FUNCTION public.biographies_sync_published_um() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_sync_published_um() TO service_role;


--
-- Name: FUNCTION biographies_um_id_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.biographies_um_id_immutable() TO anon;
GRANT ALL ON FUNCTION public.biographies_um_id_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.biographies_um_id_immutable() TO service_role;


--
-- Name: FUNCTION biography_public_read_allowed(p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.biography_public_read_allowed(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.biography_public_read_allowed(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.biography_public_read_allowed(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.biography_public_read_allowed(p_id uuid) TO service_role;


--
-- Name: FUNCTION check_and_record_submit_attempt(p_user_id uuid, p_window_secs integer, p_max_attempts integer, p_action text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_and_record_submit_attempt(p_user_id uuid, p_window_secs integer, p_max_attempts integer, p_action text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_and_record_submit_attempt(p_user_id uuid, p_window_secs integer, p_max_attempts integer, p_action text) TO service_role;


--
-- Name: FUNCTION check_biography_media_limit(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_biography_media_limit() TO anon;
GRANT ALL ON FUNCTION public.check_biography_media_limit() TO authenticated;
GRANT ALL ON FUNCTION public.check_biography_media_limit() TO service_role;


--
-- Name: FUNCTION cleanup_ai_rate_limits_30d(); Type: ACL; Schema: public; Owner: -
--

-- Solo service_role (cron Next.js) — 20261024100000.
GRANT ALL ON FUNCTION public.cleanup_ai_rate_limits_30d() TO service_role;


--
-- Name: FUNCTION delete_user_account(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.delete_user_account() TO anon;
GRANT ALL ON FUNCTION public.delete_user_account() TO authenticated;
GRANT ALL ON FUNCTION public.delete_user_account() TO service_role;


--
-- Name: FUNCTION edition_caption_media_on_original(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.edition_caption_media_on_original() FROM PUBLIC;
GRANT ALL ON FUNCTION public.edition_caption_media_on_original() TO service_role;


--
-- Name: FUNCTION enforce_one_biography_per_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_one_biography_per_user() TO anon;
GRANT ALL ON FUNCTION public.enforce_one_biography_per_user() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_one_biography_per_user() TO service_role;


--
-- Name: FUNCTION generate_biography_slug(input_text text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_biography_slug(input_text text) TO anon;
GRANT ALL ON FUNCTION public.generate_biography_slug(input_text text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_biography_slug(input_text text) TO service_role;


--
-- Name: FUNCTION get_ai_usage(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

-- Niente anon (20261024100000); il corpo controlla auth.uid() / service_role.
GRANT ALL ON FUNCTION public.get_ai_usage(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_ai_usage(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_biography_by_share_token(p_biography_id uuid, p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_biography_by_share_token(p_biography_id uuid, p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_biography_by_share_token(p_biography_id uuid, p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_biography_by_share_token(p_biography_id uuid, p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_biography_by_share_token(p_biography_id uuid, p_token text) TO service_role;


--
-- Name: FUNCTION get_my_account_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_my_account_status() TO anon;
GRANT ALL ON FUNCTION public.get_my_account_status() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_account_status() TO service_role;


--
-- Name: FUNCTION get_my_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_my_role() TO anon;
GRANT ALL ON FUNCTION public.get_my_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_role() TO service_role;


--
-- Name: FUNCTION handle_biography_published(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_biography_published() TO anon;
GRANT ALL ON FUNCTION public.handle_biography_published() TO authenticated;
GRANT ALL ON FUNCTION public.handle_biography_published() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

-- Solo trigger (20261024100000).
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION increment_biography_chapters(biography_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_biography_chapters(biography_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_biography_chapters(biography_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_biography_chapters(biography_id uuid) TO service_role;


--
-- Name: FUNCTION increment_view_count(biography_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_view_count(biography_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_view_count(biography_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_view_count(biography_uuid uuid) TO service_role;


--
-- Name: FUNCTION profile_account_is_active(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.profile_account_is_active(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.profile_account_is_active(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.profile_account_is_active(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION profiles_guard_server_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.profiles_guard_server_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.profiles_guard_server_columns() TO service_role;


--
-- Name: FUNCTION profiles_insert_defaults(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.profiles_insert_defaults() FROM PUBLIC;
GRANT ALL ON FUNCTION public.profiles_insert_defaults() TO authenticated;
GRANT ALL ON FUNCTION public.profiles_insert_defaults() TO service_role;


--
-- Name: FUNCTION profiles_server_owned_columns(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.profiles_server_owned_columns() FROM PUBLIC;
GRANT ALL ON FUNCTION public.profiles_server_owned_columns() TO authenticated;
GRANT ALL ON FUNCTION public.profiles_server_owned_columns() TO service_role;


--
-- Name: FUNCTION regenerate_share_token(p_biography_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.regenerate_share_token(p_biography_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.regenerate_share_token(p_biography_id uuid) TO anon;
GRANT ALL ON FUNCTION public.regenerate_share_token(p_biography_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.regenerate_share_token(p_biography_id uuid) TO service_role;


--
-- Name: FUNCTION reject_life_facts_on_edition(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_life_facts_on_edition() FROM PUBLIC;
GRANT ALL ON FUNCTION public.reject_life_facts_on_edition() TO service_role;


--
-- Name: FUNCTION reset_biography_engagement_email_flags(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reset_biography_engagement_email_flags() TO anon;
GRANT ALL ON FUNCTION public.reset_biography_engagement_email_flags() TO authenticated;
GRANT ALL ON FUNCTION public.reset_biography_engagement_email_flags() TO service_role;


--
-- Name: FUNCTION revoke_share_token(p_biography_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.revoke_share_token(p_biography_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revoke_share_token(p_biography_id uuid) TO anon;
GRANT ALL ON FUNCTION public.revoke_share_token(p_biography_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.revoke_share_token(p_biography_id uuid) TO service_role;


--
-- Name: FUNCTION set_biography_slug(); Type: ACL; Schema: public; Owner: -
--

-- Solo trigger (20261024100000).
GRANT ALL ON FUNCTION public.set_biography_slug() TO service_role;


--
-- Name: FUNCTION set_next_chapter_available_at(); Type: ACL; Schema: public; Owner: -
--

-- Solo trigger (20261024100000).
GRANT ALL ON FUNCTION public.set_next_chapter_available_at() TO service_role;


--
-- Name: FUNCTION update_moderation_reports_updated_at(); Type: ACL; Schema: public; Owner: -
--

-- Solo trigger (20261024100000).
GRANT ALL ON FUNCTION public.update_moderation_reports_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at() TO service_role;


--
-- Name: TABLE admin_action_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_action_log TO anon;
GRANT ALL ON TABLE public.admin_action_log TO authenticated;
GRANT ALL ON TABLE public.admin_action_log TO service_role;


--
-- Name: TABLE agent_memory_facts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.agent_memory_facts TO anon;
GRANT ALL ON TABLE public.agent_memory_facts TO authenticated;
GRANT ALL ON TABLE public.agent_memory_facts TO service_role;


--
-- Name: TABLE agent_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.agent_messages TO anon;
GRANT ALL ON TABLE public.agent_messages TO authenticated;
GRANT ALL ON TABLE public.agent_messages TO service_role;


--
-- Name: TABLE agent_threads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.agent_threads TO anon;
GRANT ALL ON TABLE public.agent_threads TO authenticated;
GRANT ALL ON TABLE public.agent_threads TO service_role;


--
-- Name: TABLE agent_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.agent_usage TO anon;
GRANT ALL ON TABLE public.agent_usage TO authenticated;
GRANT ALL ON TABLE public.agent_usage TO service_role;


--
-- Name: TABLE ai_author_token_limits; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_author_token_limits TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_author_token_limits TO authenticated;
GRANT ALL ON TABLE public.ai_author_token_limits TO service_role;


--
-- Name: TABLE ai_rate_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_rate_limits TO anon;
GRANT ALL ON TABLE public.ai_rate_limits TO authenticated;
GRANT ALL ON TABLE public.ai_rate_limits TO service_role;


--
-- Name: TABLE ai_token_usage; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_token_usage TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ai_token_usage TO authenticated;
GRANT ALL ON TABLE public.ai_token_usage TO service_role;


--
-- Name: TABLE ai_usage_tracking; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_usage_tracking TO anon;
GRANT ALL ON TABLE public.ai_usage_tracking TO authenticated;
GRANT ALL ON TABLE public.ai_usage_tracking TO service_role;


--
-- Name: TABLE analysis_jobs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analysis_jobs TO service_role;


--
-- Name: TABLE archive_package_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.archive_package_versions TO anon;
GRANT ALL ON TABLE public.archive_package_versions TO authenticated;
GRANT ALL ON TABLE public.archive_package_versions TO service_role;


--
-- Name: TABLE biographies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biographies TO anon;
GRANT ALL ON TABLE public.biographies TO authenticated;
GRANT ALL ON TABLE public.biographies TO service_role;


--
-- Name: TABLE biography_book_structure; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_book_structure TO anon;
GRANT ALL ON TABLE public.biography_book_structure TO authenticated;
GRANT ALL ON TABLE public.biography_book_structure TO service_role;


--
-- Name: TABLE biography_chunks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_chunks TO anon;
GRANT ALL ON TABLE public.biography_chunks TO authenticated;
GRANT ALL ON TABLE public.biography_chunks TO service_role;


--
-- Name: TABLE biography_edition_captions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_edition_captions TO anon;
GRANT ALL ON TABLE public.biography_edition_captions TO authenticated;
GRANT ALL ON TABLE public.biography_edition_captions TO service_role;


--
-- Name: TABLE person_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.person_events TO anon;
GRANT ALL ON TABLE public.person_events TO authenticated;
GRANT ALL ON TABLE public.person_events TO service_role;


--
-- Name: TABLE biography_flat; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.biography_flat TO anon;
GRANT SELECT ON TABLE public.biography_flat TO authenticated;
GRANT SELECT ON TABLE public.biography_flat TO service_role;


--
-- Name: SEQUENCE biography_host_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.biography_host_seq TO anon;
GRANT ALL ON SEQUENCE public.biography_host_seq TO authenticated;
GRANT ALL ON SEQUENCE public.biography_host_seq TO service_role;


--
-- Name: TABLE biography_media; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_media TO anon;
GRANT ALL ON TABLE public.biography_media TO authenticated;
GRANT ALL ON TABLE public.biography_media TO service_role;


--
-- Name: TABLE biography_sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_sections TO anon;
GRANT ALL ON TABLE public.biography_sections TO authenticated;
GRANT ALL ON TABLE public.biography_sections TO service_role;


--
-- Name: TABLE biography_source_html_legacy; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.biography_source_html_legacy TO service_role;


--
-- Name: TABLE conversation_checkpoints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.conversation_checkpoints TO anon;
GRANT ALL ON TABLE public.conversation_checkpoints TO authenticated;
GRANT ALL ON TABLE public.conversation_checkpoints TO service_role;


--
-- Name: TABLE error_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.error_logs TO anon;
GRANT ALL ON TABLE public.error_logs TO authenticated;
GRANT ALL ON TABLE public.error_logs TO service_role;


--
-- Name: TABLE kb_chunks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kb_chunks TO anon;
GRANT ALL ON TABLE public.kb_chunks TO authenticated;
GRANT ALL ON TABLE public.kb_chunks TO service_role;


--
-- Name: TABLE kb_index_state; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kb_index_state TO service_role;


--
-- Name: TABLE moderation_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.moderation_messages TO anon;
GRANT ALL ON TABLE public.moderation_messages TO authenticated;
GRANT ALL ON TABLE public.moderation_messages TO service_role;


--
-- Name: TABLE moderation_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.moderation_reports TO anon;
GRANT ALL ON TABLE public.moderation_reports TO authenticated;
GRANT ALL ON TABLE public.moderation_reports TO service_role;


--
-- Name: TABLE narrative_structures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.narrative_structures TO anon;
GRANT ALL ON TABLE public.narrative_structures TO authenticated;
GRANT ALL ON TABLE public.narrative_structures TO service_role;


--
-- Name: TABLE person_relations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.person_relations TO anon;
GRANT ALL ON TABLE public.person_relations TO authenticated;
GRANT ALL ON TABLE public.person_relations TO service_role;


--
-- Name: TABLE preprint_check_runs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.preprint_check_runs TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE publication_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.publication_records TO service_role;


--
-- Name: TABLE reviewer_languages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reviewer_languages TO anon;
GRANT ALL ON TABLE public.reviewer_languages TO authenticated;
GRANT ALL ON TABLE public.reviewer_languages TO service_role;


--
-- Name: TABLE role_change_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.role_change_log TO anon;
GRANT ALL ON TABLE public.role_change_log TO authenticated;
GRANT ALL ON TABLE public.role_change_log TO service_role;


--
-- Name: TABLE section_completions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.section_completions TO anon;
GRANT ALL ON TABLE public.section_completions TO authenticated;
GRANT ALL ON TABLE public.section_completions TO service_role;


--
-- Name: TABLE section_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.section_notes TO anon;
GRANT ALL ON TABLE public.section_notes TO authenticated;
GRANT ALL ON TABLE public.section_notes TO service_role;


--
-- Name: TABLE section_todos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.section_todos TO anon;
GRANT ALL ON TABLE public.section_todos TO authenticated;
GRANT ALL ON TABLE public.section_todos TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_settings TO service_role;
GRANT SELECT ON TABLE public.site_settings TO anon;
GRANT SELECT ON TABLE public.site_settings TO authenticated;


--
-- Name: TABLE um_identifiers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.um_identifiers TO anon;
GRANT ALL ON TABLE public.um_identifiers TO authenticated;
GRANT ALL ON TABLE public.um_identifiers TO service_role;


--
-- Name: TABLE user_notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_notifications TO anon;
GRANT ALL ON TABLE public.user_notifications TO authenticated;
GRANT ALL ON TABLE public.user_notifications TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- PostgreSQL database dump complete
--

\unrestrict nKwgvQjVkBlpLM8eqY0MXrvKGM1k9rNFQk0CQXeHDcHVCULz2oi9BW4jKlPoZeh

-- ========== auth.users → public.handle_new_user (trigger only) ==========
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== storage.buckets ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('archive', 'archive', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('biography-exports', 'biography-exports', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('biography-photos', 'biography-photos', false, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========== storage.objects policies ==========
-- Nota: non ricreare "Public read biography exports" (elenco anonimo degli oggetti).
-- Rimossa in produzione da 20261023190000_drop_public_list_biography_exports.sql;
-- il bucket biography-exports resta pubblico per gli URL diretti.
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (((bucket_id = 'biography-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ========== migration history ==========
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261022000000', 'baseline_zurich')
ON CONFLICT (version) DO NOTHING;
