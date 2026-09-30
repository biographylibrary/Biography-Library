/*
  # Allineamento dei trigger e delle funzioni di biographies e profiles alla produzione

  Letti dalla produzione il 30 settembre 2026 (pg_trigger, pg_proc). Questa
  migrazione riproduce, in modo idempotente (CREATE OR REPLACE, DROP TRIGGER IF
  EXISTS + CREATE TRIGGER), ciò che in produzione esiste e che un database
  costruito solo dalle migrazioni del repository potrebbe non avere o avere
  in forma diversa. In produzione non cambia nulla: i testi sono quelli che vi
  girano già. Serve a far sì che il banco di prova e un ramo Supabase si
  comportino come la produzione prima della migrazione di sicurezza.

  Mancavano del tutto dal repository: regenerate_share_token e revoke_share_token
  (e i loro privilegi). Le altre funzioni sono qui per avere una sola fonte
  fedele alla produzione.

  Nota sull'ordine: i trigger BEFORE dello stesso evento girano in ordine
  alfabetico di nome (ordinamento byte per byte). Quelli di biographies oggi sono
  biographies_updated_at e i trg_*. Il guard della migrazione successiva si chiama
  a00_... per precederli tutti.

  Non tocca policy, colonne, indici: il resto dello schema si allinea in un
  passaggio successivo.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni dei trigger di biographies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.biographies_keep_pioneer()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.is_pioneer := OLD.is_pioneer;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.biographies_mark_pioneer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  host_n bigint;
BEGIN
  host_n := nextval('public.biography_host_seq');
  NEW.is_pioneer := host_n <= 10000;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.biographies_require_rights_for_public()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.biographies_sync_published_um()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.biographies_um_id_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.um_id IS NOT NULL AND NEW.um_id IS DISTINCT FROM OLD.um_id THEN
    RAISE EXCEPTION 'um_id is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_one_biography_per_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.biographies
    WHERE user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'one_biography_per_user'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_biography_published()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.reset_biography_engagement_email_flags()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_biography_slug(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_biography_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
IF NEW.slug IS NULL AND NEW.title IS NOT NULL AND NEW.title != '' THEN
NEW.slug := generate_biography_slug(NEW.title);
END IF;
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_next_chapter_available_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
IF NEW.last_chapter_published_at IS NOT NULL
AND (OLD.last_chapter_published_at IS DISTINCT FROM NEW.last_chapter_published_at)
THEN
NEW.next_chapter_available_at := NEW.last_chapter_published_at + INTERVAL '365 days';
END IF;
RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger di biographies (tutti BEFORE ... FOR EACH ROW; nessun trigger AFTER)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS biographies_updated_at ON public.biographies;
CREATE TRIGGER biographies_updated_at BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_biographies_keep_pioneer ON public.biographies;
CREATE TRIGGER trg_biographies_keep_pioneer BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION biographies_keep_pioneer();

DROP TRIGGER IF EXISTS trg_biographies_mark_pioneer ON public.biographies;
CREATE TRIGGER trg_biographies_mark_pioneer BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION biographies_mark_pioneer();

DROP TRIGGER IF EXISTS trg_biographies_require_rights_for_public ON public.biographies;
CREATE TRIGGER trg_biographies_require_rights_for_public BEFORE INSERT OR UPDATE OF visibility, rights_statement_uri ON public.biographies FOR EACH ROW EXECUTE FUNCTION biographies_require_rights_for_public();

DROP TRIGGER IF EXISTS trg_biographies_sync_published_um ON public.biographies;
CREATE TRIGGER trg_biographies_sync_published_um BEFORE INSERT OR UPDATE OF published_at ON public.biographies FOR EACH ROW EXECUTE FUNCTION biographies_sync_published_um();

DROP TRIGGER IF EXISTS trg_biographies_um_id_immutable ON public.biographies;
CREATE TRIGGER trg_biographies_um_id_immutable BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION biographies_um_id_immutable();

DROP TRIGGER IF EXISTS trg_enforce_one_biography_per_user ON public.biographies;
CREATE TRIGGER trg_enforce_one_biography_per_user BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION enforce_one_biography_per_user();

DROP TRIGGER IF EXISTS trg_handle_biography_published ON public.biographies;
CREATE TRIGGER trg_handle_biography_published BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION handle_biography_published();

DROP TRIGGER IF EXISTS trg_reset_biography_engagement_email_flags ON public.biographies;
CREATE TRIGGER trg_reset_biography_engagement_email_flags BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION reset_biography_engagement_email_flags();

DROP TRIGGER IF EXISTS trg_set_biography_slug ON public.biographies;
CREATE TRIGGER trg_set_biography_slug BEFORE INSERT ON public.biographies FOR EACH ROW EXECUTE FUNCTION set_biography_slug();

DROP TRIGGER IF EXISTS trg_set_next_chapter_available_at ON public.biographies;
CREATE TRIGGER trg_set_next_chapter_available_at BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION set_next_chapter_available_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: nessun trigger su profiles in produzione. La riga la crea
-- handle_new_user, agganciato a auth.users (SECURITY DEFINER: gira come il suo
-- proprietario, quindi non è toccato dal guard).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Funzioni SECURITY DEFINER che scrivono su biographies (girano come il loro
-- proprietario: per costruzione il guard non le vede)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_biography_chapters(biography_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE biographies
  SET
    last_chapter_published_at = now(),
    chapters_count = chapters_count + 1
  WHERE id = biography_id
    AND user_id = auth.uid()
    AND status = 'published';
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_view_count(biography_uuid uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
UPDATE biographies
SET view_count = view_count + 1
WHERE id = biography_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_share_token(p_biography_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.revoke_share_token(p_biography_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- In produzione queste due non hanno il privilegio implicito a PUBLIC: lo hanno
-- anon, authenticated e service_role (le funzioni controllano auth.uid()).
REVOKE ALL ON FUNCTION public.regenerate_share_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_share_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_share_token(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_share_token(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
