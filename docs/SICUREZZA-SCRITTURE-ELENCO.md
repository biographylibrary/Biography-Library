# Scritture dal browser che un utente non dovrebbe poter fare: elenco e proposte

*30 settembre 2026. Elenco per il passaggio dedicato dopo il blocco 1; nessuna di queste correzioni è stata fatta. Letto dalla produzione (pg_policies, pg_proc, privilegi), senza scrivere nulla.*

Il principio di base: a `authenticated` e `anon` Supabase concede per difetto UPDATE/INSERT su tutte le colonne, e le policy RLS controllano quasi sempre solo `user_id = auth.uid()` sulla riga stessa. Dove la riga dipende da un'altra (la biografia), il controllo manca.

## 1. Un utente può alterare la biografia di un altro

| Tabella | Policy oggi | Difetto | Proposta |
|---|---|---|---|
| `biography_media` | INSERT/UPDATE/DELETE con `user_id = auth.uid()` | `biography_id` non è verificato: si può agganciare una foto, con didascalia, alla scheda di un altro (la foto compare nella galleria pubblica) | WITH CHECK e USING con `EXISTS (SELECT 1 FROM biographies b WHERE b.id = biography_id AND b.user_id = auth.uid() AND NOT b.is_frozen)`; UPDATE non può cambiare `biography_id` |
| `biography_book_structure` | `auth.uid() = user_id` | stesso difetto: dedica, prefazione, epigrafe finiscono nel PDF della scheda altrui | stessa correzione |
| `narrative_structures` | `user_id = auth.uid()` | stesso | stessa correzione |
| `section_completions` | `user_id = auth.uid()` | stesso; falsifica lo stato di completamento altrui | stessa correzione |
| `conversation_checkpoints` | `user_id = auth.uid()` | stesso | stessa correzione (o tabella da eliminare con la modalità conversazione, tolta) |
| `biography_sections`, `section_notes`, `section_todos` | proprietà verificata dalla biografia madre | proprietà ok; manca il blocco se la madre è pubblicata o congelata | regola del testo di una scheda pubblicata (punto E della migrazione di sicurezza, in attesa di decisione) |
| `person_events`, `person_relations` | proprietà e non congelata | ok; manca il blocco su scheda pubblicata | come sopra |

## 2. `moderation_messages`

La policy di INSERT permette a qualunque utente autenticato di scrivere in qualunque segnalazione con `sender_id` proprio. Nessun percorso legittimo inserisce dal browser (`open-moderation-report.ts`, `erase-prior-content.ts`, `moderation-register.ts` usano il servizio). **Proposta:** togliere la policy di INSERT; SELECT resta com'è.

## 3. Funzioni `SECURITY DEFINER` eseguibili da `authenticated` o `anon`

Girano come il loro proprietario (`postgres`): per costruzione aggirano il trigger guard e le policy. Elenco completo di produzione:

| Funzione | Chi la può chiamare | Che cosa fa | Proposta |
|---|---|---|---|
| `increment_biography_chapters(uuid)` | authenticated e anon | il proprietario di una scheda pubblicata alza `chapters_count` e `last_chapter_published_at` (e quindi sposta l'attesa dei 365 giorni). Nessun chiamante nel codice | eliminarla (o REVOKE) |
| `increment_view_count(uuid)` | anche anonimi, qualunque scheda | alza le visualizzazioni a piacere | spostarla su una rotta server con limite per indirizzo, oppure conteggio deduplicato |
| `delete_user_account()` | authenticated | cancella le schede dell'utente, anche pubblicate, e l'utente (contraddice «mai 404 su un ID emesso») | decisione di prodotto; se resta, rotta server con conferma e traccia |
| `check_and_record_submit_attempt(uuid, int, int)` | anche anonimi, `p_user_id` a scelta | scrive e cancella `ai_rate_limits` di un utente qualunque | REVOKE da public/anon/authenticated, GRANT al solo servizio (la usa solo il server) |
| `cleanup_ai_rate_limits_30d()` | anche anonimi | cancella righe vecchie di `ai_rate_limits` | REVOKE come sopra |
| `get_ai_usage(uuid)` | anche anonimi, `p_user_id` a scelta | legge il consumo di qualunque utente | usare `auth.uid()` invece del parametro, o REVOKE da anon |
| `regenerate_share_token(uuid)`, `revoke_share_token(uuid)` | anche anonimi (falliscono senza `auth.uid()`) | controllano proprietà o staff | REVOKE da anon |
| `generate_biography_slug(input_text text)` | anche anonimi | SECURITY DEFINER: restituisce uno slug libero leggendo tutte le schede, quindi chiunque può verificare se uno slug esiste (anche di una scheda privata) | REVOKE da anon e authenticated, serve solo al trigger `set_biography_slug` |
| `get_biography_by_share_token(uuid, text)` | anche anonimi | lettura per chi ha il token | ok |
| `get_my_role()`, `get_my_account_status()`, `profile_account_is_active(uuid)` | anche anonimi | lettura, servono alle policy | ok |
| funzioni trigger (`handle_new_user`, `biographies_mark_pioneer`, `set_biography_slug`, `set_next_chapter_available_at`, `update_moderation_reports_updated_at`) | eseguibili nominalmente | non si chiamano a mano (restituiscono `trigger`) | REVOKE EXECUTE da public, anon, authenticated, per pulizia (lo segnala anche il controllo di sicurezza di Supabase) |

**Funzioni nuove del blocco 1 (controllate il 1 ottobre 2026 sulla produzione, con la prova a secco):** undici, nessuna SECURITY DEFINER, nessuna eseguibile da anon. `authenticated` esegue soltanto sei elenchi costanti senza parametri (`biographies_server_owned_columns`, `biographies_insert_defaults`, `profiles_server_owned_columns`, `profiles_insert_defaults`, `author_text_writable_statuses`, `biographies_author_text_columns`), perché i guard le chiamano con la sessione di chi scrive. `ai_author_token_usage(p_user_id, ...)` accetta un utente ma non è SECURITY DEFINER e non è eseguibile né da anon né da authenticated (solo dal servizio). Le quattro funzioni dei trigger non sono eseguibili da chi scrive. Un test (`lib/server/__tests__/db/function-permissions.test.ts`) impedisce che ne nasca una nuova senza essere esaminata.

**Percorso di ricerca delle funzioni (1 ottobre 2026).** Le sei funzioni di elenco costante hanno `search_path` vuoto dalla migrazione `20260930120300`; i corpi usano solo oggetti di `pg_catalog` (lo dimostra `lib/server/__tests__/db/helper-functions-search-path.test.ts`). Restano segnalate dal controllo di Supabase (`function_search_path_mutable`) sei funzioni di trigger già presenti in produzione prima del blocco 1: `biographies_um_id_immutable`, `biographies_sync_published_um`, `biographies_require_rights_for_public`, `enforce_one_biography_per_user`, `handle_biography_published`, `reset_biography_engagement_email_flags`. I loro corpi qualificano già i nomi che usano, quindi basterebbe lo stesso `ALTER FUNCTION ... SET search_path = ''`; scattano a ogni scrittura su `biographies`, per questo la decisione è separata.

Le funzioni `SECURITY DEFINER` vanno riesaminate a ogni migrazione: non esiste un controllo automatico. Proposta di regola: un test che elenca quelle eseguibili da `authenticated` o `anon` e fallisce se ne compare una non dichiarata.

## 4. `moderation_reports`: l'autore non vede la motivazione

La policy di SELECT lascia leggere solo a chi ha segnalato e allo staff. L'autore di una scheda con rapporto aperto o deciso (decisione «rivedi», passaggi da correggere, note del moderatore, esito dello screening) non può leggere nulla: le query alle righe 422, 440, 1679 e 1920 dell'editor restituiscono sempre `null`. Senza questi dati non può correggere né fare appello.

**Proposta: rotta server `GET /api/moderation/my-case?biographyId=...`**, col servizio, che verifica che il chiamante sia il proprietario e restituisce per l'ultimo rapporto che riguarda la sua scheda **solo**:
`status`, `decision`, `decision_reason`, `decided_at`, `author_revision_requested_at`, `appeal_status`, `moderator_notes` (`note` e `rejectedPassages` con `section_key` e `ai_reason`), `ai_analysis.flagged_passages` (testo, sezione, motivo, gravità), `report_type` come categoria.
**Mai** `reporter_id`, `reporter_email`, `reporter_name`, `description` (il testo di chi segnala può identificarlo), `assigned_*`, `reviewed_by`, note interne, messaggi con `is_internal`. Le quattro query dell'editor passano a questa rotta. La policy di SELECT su `moderation_reports` non cambia.

## 5. Altre osservazioni

- `profiles.email` è scrivibile dall'utente: può diventare diversa da quella di autenticazione (usata per le email transazionali lette dal profilo).
- `biography_sections` e le tabelle `person_*` permettono scritture su schede congelate o pubblicate in modo disuniforme (alcune controllano `is_frozen`, altre no).
- `delete_user_account` cancella `ai_rate_limits` dell'utente: chi vuole azzerarsi il contatore al minuto può farlo cancellando e ricreando l'account.
- `help-assistant`: Edge Function ancora deployata in produzione (versione 29), assente dal repository e dichiarata inesistente nella documentazione, chiama Infomaniak senza registro né tetto. Va eliminata insieme a `ai-assistant`.

## 6. Aggiunte del 30 settembre 2026 (dopo la regola E)

- **Schede in `revision_overdue`.** Sono ferme senza via d'uscita per l'autore: i 30 giorni per la correzione sono scaduti, `/api/moderation/resubmit` accetta solo `revision_requested`, e il testo è ora bloccato (non è nell'elenco degli stati scrivibili). Restano il ricorso (`/api/moderation/appeal`) e la decisione dello staff, che può rimetterla in `revision_requested`. **Proposta:** un'azione dello staff "riapri la correzione" (nuova scadenza di 30 giorni) raggiungibile anche da una rotta dell'autore che la chiede una volta, con motivo; oppure una regola chiara di chiusura (ritorno a `draft`). Da decidere: è una regola di prodotto.
- **Lo staff scrive ancora nelle bozze altrui.** Il trigger del blocco del testo (`a01_*`) guarda lo stato della scheda madre con la sessione dell'utente; lo staff vede ogni scheda (policy di lettura di `biographies`), quindi passa quando la madre è in uno stato scrivibile. Dove succede: la policy di UPDATE di `biographies` ("owner or staff can update") consente allo staff di modificare il testo di qualunque bozza dal browser; le policy di `biography_media` e `biography_book_structure` controllano solo `user_id = auth.uid()`, non la proprietà della scheda, quindi lo staff può inserire righe con il proprio `user_id` sotto una bozza altrui. Per `biography_sections`, `person_events` e `person_relations` la policy richiede che la madre sia dell'utente e lo staff è già escluso. **Proposta:** togliere allo staff la scrittura del testo dal browser (la moderazione passa dalle rotte server, come per le colonne riservate) e far verificare al trigger delle figlie anche che la scheda madre sia dell'utente (`b.user_id = auth.uid()`), oltre allo stato.

- **Percorso di ricerca dei sei trigger di `biographies` (decisione del 1 ottobre 2026: non ora, nel passaggio sulla sicurezza).** Il controllo di Supabase (`function_search_path_mutable`) segnala ancora `biographies_um_id_immutable`, `biographies_sync_published_um`, `biographies_require_rights_for_public`, `enforce_one_biography_per_user`, `handle_biography_published`, `reset_biography_engagement_email_flags`. Erano già così in produzione prima del blocco 1. Letti i corpi il 1 ottobre: quattro non nominano nessun oggetto fuori da `pg_catalog`; `enforce_one_biography_per_user` usa `public.biographies` e `handle_biography_published` usa `public.get_my_role()`, già con lo schema. Con il percorso vuoto dovrebbero quindi continuare a funzionare, ma scattano a ogni scrittura su `biographies`: un errore qui rompe ogni salvataggio. **Procedura proposta, con il banco di prova davanti:** una migrazione con sei `ALTER FUNCTION ... SET search_path = ''`; sul banco le sei funzioni ci sono già (le crea la migrazione `20260930115900`, che il banco applica): verificare che i trigger siano agganciati come in produzione, estendere `helper-functions-search-path.test.ts` con le stesse prove (valori, corpi senza riferimenti fuori da `pg_catalog`, controllo negativo) e far passare tutti i test sui trigger (`user-flows`, `server-only-columns`, `author-text-whitelist`, la regola dei capitoli e quella della licenza); poi prova a secco e applicazione con allineamento della versione. Esito atteso: gli avvisi sul percorso di ricerca passano da 6 a 0.
- **Privilegi di tabella predefiniti di Supabase.** `anon` e `authenticated` hanno su ogni tabella di `public` tutti i privilegi (anche `TRUNCATE`, `TRIGGER`, `REFERENCES`), compreso `biographies`; sulle tabelle nuove del blocco 1 (`ai_token_usage`, `ai_author_token_limits`) le migrazioni hanno tolto INSERT, UPDATE e DELETE ma sono rimasti questi tre (controllato il 1 ottobre 2026). Da PostgREST non si raggiungono (non espone `TRUNCATE`, e le policy di RLS decidono le righe), quindi non è una regressione né un'esposizione oggi; lo diventerebbe solo con una connessione diretta al database con quei ruoli. **Proposta:** `REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated` più `ALTER DEFAULT PRIVILEGES` per le tabelle future, con la prova dei privilegi sul banco e il confronto delle impronte in produzione.

## Foto: porta del bucket chiusa, porta della riga ancora aperta (6 ottobre 2026)

Con il blocco 4 il browser non scrive più file nel bucket `biography-photos` (migrazione `20261006120000`): tutto passa dalla rotta `POST /api/biography/[id]/media`, che controlla, comprime e scrive con la chiave di servizio. Resta aperta la scrittura diretta della **riga** di `biography_media` (policy di INSERT e UPDATE con solo `user_id = auth.uid()`): l'autore può scrivere un `file_url` a piacere, cioè un indirizzo falso nella galleria, non un file nel bucket. Il rimedio pulito è togliere INSERT e UPDATE al browser su quella tabella e far passare anche didascalie e ordine da una rotta server; è un passaggio a parte. Dopo la migrazione `20261006120000` il bucket ha un limite di 20 MiB per file (`file_size_limit`, lo stesso della rotta e del pannello foto); non ha ancora un elenco di tipi ammessi (`allowed_mime_types`): ora che nessun browser scrive, si può impostare senza rischi per il flusso (`image/jpeg`).
