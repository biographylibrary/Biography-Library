/*
  # Colonne e scritture riservate al server

  Problema (verificato in produzione il 30 settembre 2026): ai ruoli `authenticated`
  e `anon` Supabase concede UPDATE/INSERT su tutte le colonne, e le policy RLS
  controllano solo la proprietà della riga. Quindi, con una chiamata diretta dal
  browser:

  - un autore può scrivere status = 'published', ai_screening_status = 'passed',
    final_pdf_approved_at, published_at, is_frozen e le altre colonne di stato,
    saltando lo screening; può anche creare una biografia già pubblicata;
  - un utente può scrivere profiles.role = 'super_admin' o
    profiles.account_status = 'active' (salta la lista d'attesa);
  - un utente può inserire in moderation_reports un rapporto di screening
    già "decided".

  Soluzione: un trigger per tabella che, quando la sessione gira come `authenticated`
  o `anon`, rifiuta la scrittura delle colonne riservate. Il controllo usa
  current_user (il ruolo della sessione), non il JWT: passano quindi il ruolo di
  servizio (service_role), gli script collegati direttamente al database (postgres)
  e le funzioni SECURITY DEFINER (current_user diventa il loro proprietario).
  Le funzioni dei trigger NON sono SECURITY DEFINER, altrimenti current_user
  sarebbe sempre il proprietario e il controllo non varrebbe mai.

  Non c'è esenzione per lo staff: la moderazione passa dalle rotte server.

  Il confronto fra vecchio e nuovo valore usa IS DISTINCT FROM (via jsonb): un
  UPDATE che rimanda una colonna riservata con lo stesso valore non viene rifiutato.

  ## Limite noto
  In INSERT non si può distinguere un `id` fornito da uno generato: `id` è
  protetto solo in UPDATE. `created_at` in INSERT deve essere uguale a now()
  (il valore predefinito).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- biographies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biographies_guard_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Colonne che scrive solo il server. `status` ha una regola a parte.
  reserved constant text[] := ARRAY[
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
    'is_pioneer', 'um_id'
  ];
  -- Valore atteso all'inserimento; le colonne assenti devono essere NULL.
  defaults constant jsonb := jsonb_build_object(
    'schema_version', 2,
    'ai_screening_status', 'pending',
    'is_frozen', false,
    'is_featured', false,
    'view_count', 0,
    'chapters_count', 0,
    'is_pioneer', false
  );
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

-- Prefisso 00: gira prima degli altri trigger BEFORE (ordine alfabetico).
DROP TRIGGER IF EXISTS trg_00_biographies_guard_server_columns ON public.biographies;
CREATE TRIGGER trg_00_biographies_guard_server_columns
  BEFORE INSERT OR UPDATE ON public.biographies
  FOR EACH ROW EXECUTE FUNCTION public.biographies_guard_server_columns();

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.profiles_guard_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reserved constant text[] := ARRAY[
    'id', 'created_at',
    'role', 'account_status', 'waitlist_granted_at',
    'legal_declaration_accepted_at', 'legal_declaration_type', 'legal_declaration_version',
    'welcome_email_sent_at'
  ];
  defaults constant jsonb := jsonb_build_object(
    'role', 'user',
    'account_status', 'waitlist'
  );
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

DROP TRIGGER IF EXISTS trg_00_profiles_guard_server_columns ON public.profiles;
CREATE TRIGGER trg_00_profiles_guard_server_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_server_columns();

-- ─────────────────────────────────────────────────────────────────────────────
-- moderation_reports
-- Le segnalazioni dei lettori arrivano da /api/moderation/report (ruolo di
-- servizio, limite per indirizzo e per account): nessun percorso legittimo
-- scrive dal browser, e le due policy di INSERT diretto servivano solo ad
-- aggirare quel limite. UPDATE resta allo staff; DELETE non ha policy.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Any authenticated user can file a report" ON public.moderation_reports;
DROP POLICY IF EXISTS "Anonymous users can file a report without reporter_id" ON public.moderation_reports;
