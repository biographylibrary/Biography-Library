/*
  # Il testo di una scheda si scrive solo negli stati di lavoro

  Problema (verificato in produzione il 30 settembre 2026): le policy RLS di
  `biographies` e delle tabelle figlie controllano la proprietà della riga, non lo
  stato della scheda. Un autore può quindi riscrivere con una chiamata diretta il
  testo di una scheda in revisione, in attesa di screening o già pubblicata, cioè
  il testo che lo screening ha esaminato o che il pubblico sta leggendo.

  Regola: elenco CHIUSO di stati in cui l'autore scrive testo; in ogni altro stato
  il testo è bloccato, anche durante `under_review` e `locked_pending_screening`.

    draft, sections_complete, final_version  lavoro ordinario
    pdf_draft                                giro di correzione dopo il controllo prima della stampa
    revision_requested                       correzione chiesta dal revisore (30 giorni)

  Sono fuori: locked_pending_screening, under_review, revision_pending_review,
  published, revision_overdue (nessun percorso per inviare la correzione), removed,
  suspended_pending_verification. Uno stato nuovo nasce bloccato finché non viene
  aggiunto qui di proposito.

  Vale per le sessioni `authenticated` e `anon` (current_user, come i guard della
  migrazione 20260930120000). Passano il ruolo di servizio, gli script diretti e le
  funzioni SECURITY DEFINER: le rotte server che scrivono testo con la chiave di
  servizio (Echo, conversione di modalità) controllano lo stato nel codice, con lo
  stesso elenco (lib/publication-state.ts); un test confronta i due elenchi.

  Le tabelle figlie che arrivano alla pagina pubblica, al PDF e all'archivio
  (biography_sections, biography_book_structure, person_events, person_relations,
  biography_media) seguono lo stato della scheda madre. Niente esenzione per lo
  staff: la moderazione passa dalle rotte server.

  ## Come si legge lo stato della madre
  Il trigger delle tabelle figlie NON è SECURITY DEFINER (altrimenti current_user
  sarebbe il proprietario e il controllo non scatterebbe mai): legge la scheda madre
  con la sessione dell'utente, quindi con le policy RLS di `biographies`. Una madre
  che l'utente non vede (non sua, rimossa, account non attivo) vale come bloccata.
  Le cancellazioni a cascata (FK ON DELETE CASCADE) girano con i privilegi del
  proprietario della tabella e passano: eliminare la scheda non si rompe.

  ## Limiti noti
  - Sono protette le colonne di testo di `biographies` elencate in
    biographies_author_text_columns(). Altre colonne (visibilità, licenza,
    slug, dimensione del carattere...) restano scrivibili in ogni stato: non sono
    testo, e la scelta della licenza serve proprio dopo la pubblicazione.
  - Le tabelle section_notes, section_todos, narrative_structures e
    section_completions non arrivano al pubblico: fuori da questa regola.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Elenchi (funzioni a sé: i test li confrontano con il codice TypeScript)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.author_text_writable_statuses()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'draft', 'sections_complete', 'final_version',
    'pdf_draft',
    'revision_requested'
  ]::text[];
$$;

-- Colonne di `biographies` che finiscono nella pagina pubblica, nel PDF, negli
-- esporti o nell'archivio, o che ne decidono l'ordine.
CREATE OR REPLACE FUNCTION public.biographies_author_text_columns()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'title', 'content', 'content_freeflow', 'final_version', 'narrative_order',
    'author_name', 'subject_name',
    'name_as_written', 'name_given', 'name_family', 'name_order',
    'name_romanized', 'romanization_system',
    'content_html_legacy'
  ]::text[];
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- biographies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.biographies_guard_author_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- a01_: subito dopo a00_biographies_guard_server_columns, prima di ogni altro trigger.
DROP TRIGGER IF EXISTS a01_biographies_guard_author_text ON public.biographies;
CREATE TRIGGER a01_biographies_guard_author_text
  BEFORE UPDATE ON public.biographies
  FOR EACH ROW EXECUTE FUNCTION public.biographies_guard_author_text();

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabelle figlie: seguono lo stato della scheda madre
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.author_text_child_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS a01_biography_sections_guard_parent_status ON public.biography_sections;
CREATE TRIGGER a01_biography_sections_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.biography_sections
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

DROP TRIGGER IF EXISTS a01_biography_book_structure_guard_parent_status ON public.biography_book_structure;
CREATE TRIGGER a01_biography_book_structure_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.biography_book_structure
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

DROP TRIGGER IF EXISTS a01_person_events_guard_parent_status ON public.person_events;
CREATE TRIGGER a01_person_events_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.person_events
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

DROP TRIGGER IF EXISTS a01_person_relations_guard_parent_status ON public.person_relations;
CREATE TRIGGER a01_person_relations_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.person_relations
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

DROP TRIGGER IF EXISTS a01_biography_media_guard_parent_status ON public.biography_media;
CREATE TRIGGER a01_biography_media_guard_parent_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.biography_media
  FOR EACH ROW EXECUTE FUNCTION public.author_text_child_guard();

-- Le funzioni dei trigger non si chiamano a mano (lo segnala anche il controllo di
-- sicurezza di Supabase): i trigger le eseguono comunque.
REVOKE EXECUTE ON FUNCTION public.biographies_guard_author_text() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.author_text_child_guard() FROM PUBLIC, anon, authenticated;
