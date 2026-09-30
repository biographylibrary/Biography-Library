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
| `get_biography_by_share_token(uuid, text)` | anche anonimi | lettura per chi ha il token | ok |
| `get_my_role()`, `get_my_account_status()`, `profile_account_is_active(uuid)` | anche anonimi | lettura, servono alle policy | ok |
| funzioni trigger (`handle_new_user`, `biographies_mark_pioneer`, `set_biography_slug`, `set_next_chapter_available_at`, `update_moderation_reports_updated_at`) | eseguibili nominalmente | non si chiamano a mano (restituiscono `trigger`) | REVOKE EXECUTE da public, anon, authenticated, per pulizia (lo segnala anche il controllo di sicurezza di Supabase) |

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

