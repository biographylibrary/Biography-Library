/*
  # Ritorno indietro della migrazione di sicurezza (NON si applica da sola)

  Da usare SOLO se, dopo aver applicato in produzione le migrazioni
    20260930120000_server_only_columns_and_reports.sql
    20260930120150_author_text_whitelist.sql
  qualcosa si rompe (per esempio un percorso dell'app rifiuta scritture che
  dovrebbero passare). Riporta i trigger e le policy com'erano in produzione il
  30 settembre 2026, prima di quelle due migrazioni.

  Sta in supabase/rollback/, non in supabase/migrations/: la CLI di Supabase non la
  applica mai da sola. Si esegue a mano (editor SQL o `supabase db execute`),
  in un'unica transazione.

  ## Che cosa toglie
  - i guard delle colonne riservate su biographies e profiles (a00_);
  - il blocco del testo per stato su biographies e sulle cinque tabelle figlie (a01_);
  - le funzioni che li sostengono (elenchi di colonne, valori predefiniti, elenco degli stati).

  ## Che cosa rimette
  - su moderation_reports le due policy di INSERT diretto (autenticati e anonimi);
  - su profiles la policy "Users can insert own profile".
  Le definizioni sono quelle lette da pg_policies in produzione.

  ## Che cosa NON tocca
  - 20260930115900_align_biographies_profiles_triggers.sql: ricrea a parità le funzioni
    e i trigger che in produzione già esistono, non c'è nulla da disfare;
  - 20260930115700_publication_records.sql: il registro delle impronte resta (è una
    tabella nuova, scritta solo dal server; lasciarla non cambia nulla). Per
    eliminarla, in un secondo momento: DROP TABLE public.publication_records;
  - 20260930115800_ai_token_usage.sql: non è di sicurezza.

  ## Dopo il ritorno indietro
  Il codice nuovo dell'app continua a funzionare: scrive le colonne riservate con il
  ruolo di servizio, che i guard non hanno mai fermato. Tornano però possibili le
  scritture dirette dal browser che i guard impedivano: è il motivo per cui questo
  ritorno indietro è un'emergenza e non uno stato da tenere.
*/

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Blocco del testo per stato (20260930120150)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS a01_biography_sections_guard_parent_status ON public.biography_sections;
DROP TRIGGER IF EXISTS a01_biography_book_structure_guard_parent_status ON public.biography_book_structure;
DROP TRIGGER IF EXISTS a01_person_events_guard_parent_status ON public.person_events;
DROP TRIGGER IF EXISTS a01_person_relations_guard_parent_status ON public.person_relations;
DROP TRIGGER IF EXISTS a01_biography_media_guard_parent_status ON public.biography_media;
DROP TRIGGER IF EXISTS a01_biographies_guard_author_text ON public.biographies;

DROP FUNCTION IF EXISTS public.author_text_child_guard();
DROP FUNCTION IF EXISTS public.biographies_guard_author_text();
DROP FUNCTION IF EXISTS public.biographies_author_text_columns();
DROP FUNCTION IF EXISTS public.author_text_writable_statuses();

-- ─────────────────────────────────────────────────────────────────────────────
-- Colonne riservate al server (20260930120000)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS a00_biographies_guard_server_columns ON public.biographies;
DROP TRIGGER IF EXISTS a00_profiles_guard_server_columns ON public.profiles;

DROP FUNCTION IF EXISTS public.biographies_guard_server_columns();
DROP FUNCTION IF EXISTS public.profiles_guard_server_columns();
DROP FUNCTION IF EXISTS public.biographies_server_owned_columns();
DROP FUNCTION IF EXISTS public.biographies_insert_defaults();
DROP FUNCTION IF EXISTS public.profiles_server_owned_columns();
DROP FUNCTION IF EXISTS public.profiles_insert_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- Policy tolte dalla migrazione 20260930120000, come erano in produzione
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Any authenticated user can file a report" ON public.moderation_reports;
CREATE POLICY "Any authenticated user can file a report"
  ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anonymous users can file a report without reporter_id" ON public.moderation_reports;
CREATE POLICY "Anonymous users can file a report without reporter_id"
  ON public.moderation_reports FOR INSERT TO anon
  WITH CHECK (reporter_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

COMMIT;
