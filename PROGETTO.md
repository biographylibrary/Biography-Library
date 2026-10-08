# Biography Library — stato del progetto

> Documento di contesto per Claude Projects. Riassume le decisioni prese, ciò che è implementato e ciò che è in corso, in modo che ogni nuova sessione parta allineata senza ripetere il pregresso.
>
> **Aggiornare** questo file quando si completa un piano significativo o si prendono decisioni architetturali nuove. Vedi `scripts/update-project-doc.sh` per l'aggiornamento assistito.

---

## Cos'è Biography Library

Piattaforma web che aiuta le persone a scrivere la propria biografia (o quella di un defunto) in modo guidato, con supporto AI. L'utente scrive in un documento unico, riceve aiuto da un agente conversazionale (Echo), può pubblicare la biografia come PDF e condividerla nel catalogo pubblico.

Fondatore unico, non sviluppatore: costruisce con Claude Code e Cursor. Non ci sono altri collaboratori tecnici. Le scelte architetturali privilegiano servizi gestiti (Supabase, Infomaniak, Jelastic) e piani completabili in autonomia.

**Stack attuale**: Next.js 13.5 App Router · Supabase (Postgres, Auth, Storage, pgvector) · Jelastic (hosting) · Infomaniak AI Services (inferenza LLM) · Mistral La Plateforme (TTS voce)

---

## Stato dell'implementazione (8 ottobre 2026)

### Blocco 3: screening a pezzi e controllo finale (8 ottobre 2026, ramo `blocco-3-screening`)

**Screening sull’intero testo**: `runPublicationScreening` spezza il Markdown lungo titoli e paragrafi (`lib/agents/screening/split-markdown-chunks.ts`), con pezzo massimo **23 863 token / 95 452 caratteri** (un quarto della finestra Infomaniak da 100 000 token per Gemma 4 31B, tolti prompt e uscita). Ogni pezzo porta l’ultimo paragrafo del precedente come contesto. Al massimo due pezzi in parallelo; timeout 180 s; fino a tre tentativi sullo stesso modello (timeout/429/503) prima del ripiego. Se anche un solo pezzo resta senza verdetto → `ai_error` e coda umana. A pezzi tutti riusciti, `examined_chars = source_chars` e l’impronta in `publication_records` è quella del testo ricostruito. La regola `examined_chars < source_chars` resta come ultima verifica.

**Righe di conversione di formato**: `latestScreening` ignora le righe con `reason = FORMAT_CONVERSION_REASON` (non sono screening veri); restano traccia dell’impronta. Un test dimostra che non bastano a pubblicare un testo cambiato.

**Controllo finale prima della stampa**: tolto `runDraftAiReview` dai giri di bozza. Le bozze PDF incrementano solo `pdf_draft_iteration` (`POST /api/publication/record-pdf-draft`). L’autore chiede un unico controllo a pezzi (`POST /api/publication/preprint-check`, scopo `preprint_check`, fuori tetto autore): una volta per impronta del contenuto, al massimo 3 per biografia in 30 giorni (`PREPRINT_CHECK_MAX_PER_30_DAYS`, tabella `preprint_check_runs`). Non blocca l’approvazione del PDF.

**Limiti di frequenza**: `check_and_record_submit_attempt` accetta `p_action` distinto per rotta (`review_submit`, `approve_final_pdf`, `preprint_check`, `record_pdf_draft`, …).

**Migrazioni** (da applicare in produzione solo dopo conferma): `20261008120000_submit_attempt_per_action.sql`, `20261008120100_preprint_check_runs.sql`.

**Filigrana PDF**: etichette dedicate per le bozze 1–3; dalla 4ª in poi etichetta generica con il numero (`PDF_DRAFT_MAX_ITERATION = 30`).

### Blocco 1: strumenti di intelligenza artificiale (30 settembre 2026, ramo `blocco-1-strumenti-ai`)

**Tolto**: traduzione automatica per i lettori (rotte `translate-view` e `available-languages`, `lib/biography-view-translate.ts`, selettore della lingua di lettura, tabella `biography_view_translations`); l'Edge Function `ai-assistant` per intero e le sue azioni `prompts`, `summary`, `rewrite`, `analyze-answer`, `recommend-next-section`, `analyze-themes`, `propose-structures`, `detect-section`, `coach-chat`, `pre-publication-check`; revisione di sezione con IA e revisione Apertus; domande guidate e riassunto; modalità conversazione; coach biografico e revisore di pubblicazione come agenti (restano gli strumenti di Echo); `platform_guide` come tipo di agente. Tolta anche l'Edge Function `help-assistant` (versione 29 deployata in produzione, assente dal repository: rispondeva alle domande sulla piattaforma con la base di conoscenza 1.3 e i modelli Nemotron e Ministral, fuori dal client unico e senza registro né tetto; ora è Echo la guida). Il suo sorgente deployato è conservato in `docs/legacy/help-assistant/`. Il selettore delle edizioni per le traduzioni dell'autore verrà in un blocco successivo.

**Cambiato**: il controllo grammaticale è una rotta Next.js (`/api/biography/[id]/grammar`, runtime Node) che verifica sessione, account attivo, proprietà o staff, biografia non congelata (le regole delle policy RLS di UPDATE su `biographies`); un solo client verso Infomaniak con registrazione del consumo; tetti in token pronti e disattivati. `FinalReviewDialog` è rimasto come passaggio **senza IA** ("Prepara la versione finale"): porta la modalità a sezioni allo stato `final_version`, senza il quale la bozza PDF non parte.

**Sicurezza (cinque migrazioni nuove, non ancora applicate alla produzione)**: verificato in produzione che il ruolo `authenticated` poteva scrivere ogni colonna di `biographies` e `profiles` e che le policy controllavano la proprietà della riga, mai lo stato della scheda.

1. `20260930115900_align_biographies_profiles_triggers.sql`: riproduce in modo idempotente i trigger e le funzioni che in produzione già esistono e che il repository non aveva (in particolare `regenerate_share_token` e `revoke_share_token`), così che banco di prova e rami Supabase si comportino come la produzione. In produzione non cambia nulla.
2. `20260930120000_server_only_columns_and_reports.sql`: trigger `BEFORE INSERT OR UPDATE` (nome `a00_...`, il primo in ordine alfabetico, per vedere solo le modifiche del client) su `biographies` e `profiles` riservano al server (ruolo di sessione diverso da `authenticated` e `anon`) stato di pubblicazione, esito dello screening, congelamento, date, ruolo, stato dell'account e le altre colonne di stato; l'autore cambia `status` solo fra `draft`, `sections_complete` e `final_version`. Le policy di INSERT diretto su `moderation_reports` e su `profiles` sono tolte: le segnalazioni passano solo da `/api/moderation/report`, il profilo lo crea `handle_new_user`.
3. `20260930120150_author_text_whitelist.sql` (regola E): il testo si scrive solo negli stati di un **elenco chiuso**: `draft`, `sections_complete`, `final_version`, `pdf_draft`, `revision_requested`. In ogni altro stato è bloccato, anche durante `under_review` e `locked_pending_screening`. Vale per le colonne di testo di `biographies` (titolo, nomi, `content`, `content_freeflow`, `final_version`, ordine narrativo) e, secondo lo stato della scheda madre, per `biography_sections`, `biography_book_structure`, `person_events`, `person_relations` e `biography_media`. `revision_overdue` è fuori dall'elenco perché non esiste un percorso per inviare la correzione (`/api/moderation/resubmit` accetta solo `revision_requested`). Uno stato nuovo nasce bloccato. Le rotte server che scrivono testo con la chiave di servizio (`apply-draft` di Echo, conversione di modalità) controllano lo stato nel codice con lo stesso elenco (`lib/publication-state.ts`); un test confronta i due elenchi. L'editor è in sola lettura fuori elenco, compresa la versione finale di una scheda pubblicata (prima era scrivibile per difetto); i pannelli che scrivono testo (foto e didascalie, struttura del libro, permanenza, importazione, titolo e nomi, cambio di modalità) non si aprono e un avviso dice che il testo è bloccato, invece di lasciar fallire il salvataggio in silenzio. Restano modificabili in ogni stato le scelte che non sono testo: visibilità, licenza, dimensione del carattere. **Conseguenza da sapere**: la correzione sul posto dei passaggi segnalati dallo screening in `under_review` e il pulsante "Reinvia allo screening" non esistono più; per far correggere un testo segnalato c'è `revision_requested`, decisa dal revisore (30 giorni, invio, riesame). Resta il nuovo tentativo dell'autore dopo un errore dell'analisi automatica ("Riprova analisi"), che non cambia il testo. **Correzione richiesta dal revisore**: quando l'autore invia la correzione (`/api/moderation/resubmit`, da `revision_requested` a `revision_pending_review`) il server lancia da sé lo screening sul testo corretto, senza pubblicare; l'esito (riassunto e passaggi segnalati) si allega al rapporto aperto, dove il revisore lo vede (il vecchio esito resta in `previous_analysis`), e l'impronta del testo esaminato va nel registro. Il revisore approva vedendo l'esito e `gatedPublish` pubblica solo se il testo è ancora quello esaminato. Se lo screening non gira, l'invio dell'autore riesce comunque e il revisore trova scritto che va rilanciato; la pubblicazione forzata, con traccia, resta per le eccezioni.
4. `20260930115700_publication_records.sql`: registro `publication_records`, scritto e letto solo dal server (nessuna policy, privilegi tolti ai ruoli dell'API). Vedi "Impronta del testo alla pubblicazione" nelle decisioni fisse.
5. `20260930115800_ai_token_usage.sql`: registro dei consumi e tetti (vedi sopra, non è di sicurezza).

`/api/onboarding` e `/api/publication/start-pdf-draft` scrivono ora col ruolo di servizio (la dichiarazione legale ha data e versione fissate dal server). Le scritture dello staff sulle colonne riservate passano da `POST /api/admin/biographies/action`; le decisioni di moderazione accettano dal browser solo un elenco di colonne e di stati; `/api/review/submit` scrive da sé lo stato `under_review`. **Ritorno indietro**: `supabase/rollback/20260930_security_rollback.sql` (non si applica da sola, una transazione) toglie guard e blocchi e rimette le tre policy tolte; è provato sul banco (il catalogo torna uguale a quello precedente). Da usare solo se la produzione si rompe. L'elenco delle altre scritture dal browser da correggere (schede altrui, `moderation_messages`, funzioni `SECURITY DEFINER`, visibilità dei rapporti all'autore) è in `docs/SICUREZZA-SCRITTURE-ELENCO.md`: da fare in un passaggio dedicato (il punto E di quel file è ora deciso come sopra).

**Riapertura per un nuovo capitolo**: `POST /api/biography/reopen` porta la propria scheda da `published` a `draft` (lo stato lo scrive il server) solo se sono passati i 365 giorni dall'ultima pubblicazione (`next_chapter_available_at`); il controllo è alla riapertura e non alla ripubblicazione, così l'autore non scrive un capitolo che non potrebbe pubblicare. **Limite noto**: mentre scrive il nuovo capitolo la scheda non è più pubblicata, quindi sparisce dal catalogo e dalla sua pagina pubblica (l'interfaccia lo dice prima di riaprire). Si risolve nel blocco Markdown con una copia di lavoro separata: la versione pubblicata resta online finché la nuova non supera lo screening.

**Limiti noti del blocco 1** (non corretti qui, con il blocco che li risolve):

1. ~~*La pagina pubblica legge solo `content`.*~~ **Chiuso nel blocco 2 Markdown (6 ottobre 2026):** la pagina pubblica legge anche `content_freeflow` / `biography_mode` e rende il foglio libero.
2. *La scheda riaperta sparisce dal catalogo* mentre l'autore scrive il nuovo capitolo (vedi "Riapertura"). Stesso blocco, con una copia di lavoro separata.
3. ~~*Lo screening legge al massimo 6000 caratteri*~~ — risolto nel blocco 3 (screening a pezzi, 8 ottobre 2026).
4. *Le schede in `revision_overdue` restano ferme senza via d'uscita per l'autore*: i 30 giorni sono passati, `/api/moderation/resubmit` accetta solo `revision_requested`, resta il ricorso e la decisione dello staff. Nell'elenco `docs/SICUREZZA-SCRITTURE-ELENCO.md`, per il passaggio successivo.
5. *Lo staff può ancora scrivere nelle bozze altrui* dal browser (policy di UPDATE di `biographies`; righe di `biography_media` e `biography_book_structure`, le cui policy controllano solo `user_id`). Anche questo nell'elenco della sicurezza.
6. *I pannelli foto, struttura del libro e importazione non hanno una vera modalità di sola lettura*: fuori dagli stati di lavoro non si aprono e un avviso lo dice.

### Blocco 4: foto (6 ottobre 2026, ramo `blocco-4-foto`)

**Cambiato**: il caricamento delle foto non passa più dal browser. Prima il browser scriveva il file direttamente nel bucket `biography-photos` (nessun limite vero di peso né di dimensioni, EXIF e posizione GPS compresi, nessun controllo sul contenuto). Ora il browser manda il file alla rotta `POST /api/biography/[id]/media` (`app/api/biography/[id]/media/route.ts`, Node), che controlla chi scrive (proprietario, account attivo, scheda non congelata, stato di lavoro), controlla il contenuto dai primi byte (JPEG, PNG, WebP; HEIC e GIF no), elabora con `sharp` (`lib/server/photo-processing.ts`) e scrive con la chiave di servizio. L'elaborazione applica l'orientamento EXIF ai pixel, converte in sRGB, toglie ogni metadato (EXIF, XMP, IPTC, GPS, profilo colore), appiattisce la trasparenza su bianco, porta il lato lungo a 2560 pixel per la galleria e a 3100 per le copertine (`cover`, `cover_a5`) senza mai ingrandire, e salva in JPEG progressivo mozjpeg qualità 85. Il file elaborato sostituisce quello di partenza, che non viene conservato. Limite in ingresso 20 MB, tetto di 150 milioni di pixel contro le bombe di decompressione. La galleria resta a 15 foto per biografia (era 30 nel codice e 10 nel vecchio controllo del database: ora è 15 ovunque, con un test che lo verifica).

**Colonne nuove** in `biography_media` (tutte facoltative): `width`, `height`, `bytes`, `original_bytes`. Nulle significa «non ancora elaborata dal server».

**Porta del browser chiusa**: la migrazione `20261006120000_storage_biography_photos_server_only_writes` toglie al browser le policy di inserimento e di aggiornamento sul bucket (restano la lettura delle proprie foto e la cancellazione) e fissa sul bucket il limite di 20 MiB per file, lo stesso numero della rotta e del pannello foto: «20 MB per immagine» vale in tutti e tre i punti, e un test li tiene uguali. La guida e la base di conoscenza di Echo dicevano «foto fino a 5 MB», un valore che non corrispondeva più a niente: ora dicono 20 MB nelle quattro lingue. Chi scrive è solo il server. **Applicata in produzione il 6 ottobre 2026, dopo il deploy** (PR 102 unita alle 08:27 UTC; controllo: la rotta risponde 401 senza accesso, quindi il codice nuovo e `sharp` sono in linea); applicata prima, il vecchio codice, che scrive dal browser, avrebbe smesso di funzionare. Le altre tre migrazioni del blocco (`20261006090000`, `20261006100000`, `20261006110000`) sono state applicate lo stesso giorno prima del deploy, tutte riallineate alla versione del file. Anche il secondo punto da cui il browser scriveva nel bucket, il salvataggio della copertina originale (`lib/editor/save-original-cover.ts`), passa dalla stessa rotta.

**Il bucket sotto controllo di versione**: `20261006100000_storage_biography_photos_bucket` descrive il bucket `biography-photos` (privato, senza limite di peso né elenco di tipi ammessi) e le sue quattro policy sulla cartella dell'utente (inserimento, lettura, aggiornamento, cancellazione). In produzione esisteva già, creato a mano: la migrazione lo rende ripetibile (utile per la Fase 2) e non cambia nulla dove c'è già.

**Foto già caricate**: lo script `scripts/recompress-photos.ts` (`npm run photos:recompress`) lavora per impostazione predefinita in simulazione e riporta per ogni foto peso attuale e stimato. Con `--apply` scrive il file nuovo con un percorso nuovo, lo rilegge e controlla che sia quello atteso, aggiorna la riga e controlla dove punta, e solo dopo cancella il vecchio; se un passo fallisce il vecchio resta e la riga torna com'era. Se due righe condividono lo stesso file (le copertine `cover` e `cover_a5`) il vecchio si cancella solo quando nessuna lo usa più. Non tocca mai il bucket `archive`. **Decisione del 6 ottobre 2026: le foto già presenti non si ricomprimono**, restano com'erano (con le colonne di dimensione nulle: «non ancora elaborata dal server»); lo script resta a disposizione e `--apply` non si esegue. Simulazione del 6 ottobre 2026 sulla produzione: 70 foto, 28,31 MB prima, 10,45 MB stimati dopo; cinque foto sopra 1 MB passano da 20,75 a 2,46 MB, le altre 65 (immagini del catalogo demo già compresse) crescono di circa il 7% perché si tolgono i metadati.

**PDF con 15 foto a tutta pagina** (test `lib/pdf/__tests__/pdf-with-photos.test.ts`, generatore vero, foto da 12 megapixel): con le foto di partenza il PDF pesa 61,10 MB, con quelle compresse 7,02 MB; stesse 19 pagine e 16 immagini.

**Da sapere**: in Next 13.5 il pacchetto `standalone` non contiene il binario nativo di `sharp` (`@img/sharp-<piattaforma>`, caricato con un `require` dinamico che il tracciamento non vede; `outputFileTracingIncludes` non vale per le rotte dell'App Router in questa versione). Il `Dockerfile` lo copia a mano; senza quella riga la rotta risponderebbe 500 solo in produzione. Il workflow `.github/workflows/docker-image.yml` costruisce l'immagine e prova che `sharp` funzioni dentro.

**Aperto**: (1) la porta più larga di `biography_media`, l'inserimento e l'aggiornamento diretti dal browser con un `file_url` scelto dall'autore (un indirizzo falso nella riga, non un file nel bucket), resta, ed è nell'elenco della sicurezza; (2) il bucket non ha ancora un elenco di tipi ammessi (`allowed_mime_types`): ora che nessun browser scrive si può impostare senza rischi (`image/jpeg`); il limite di peso, 20 MiB, arriva con la migrazione `20261006120000`; (3) un eventuale limite di corpo della richiesta davanti all'applicazione (nginx del nodo Jelastic) va controllato sui 20 MB; (4) la base di conoscenza di Echo è stata aggiornata il 6 ottobre 2026 con `kb:seed` (11 frammenti riscritti, 52 già uguali): ora dice 15 foto e 20 MB nelle quattro lingue.

### Funzionalità utente completate

**Autenticazione e profilo**
- Registrazione, login, reset password, verifica email con Resend
- Lista d’attesa beta: la home `/` è la landing; login su `/login`; i nuovi account nascono `waitlist`; holding con sola data di registrazione; admin concede l’accesso in blocco
- Blocco lingua alla registrazione: l'utente sceglie IT/EN/FR/DE e l'app usa quella lingua per tutte le email transazionali
- Onboarding obbligatorio con wizard a passaggi e tour guidato della piattaforma (anche mobile) — solo dopo l’accesso
- Impostazioni profilo e notifiche

**Creazione e scrittura biografia**
- Due tipi: autobiografia (soggetto vivo, narratore = soggetto) e biografia di defunto (memorial)
- Editor a foglio unico, come un programma di scrittura. I capitoli sono i titoli che l’autore segna nel testo; non ci sono nove sezioni di vita né una modalità testo libero da scegliere
- Importazione che conserva grassetto, corsivo e titoli. Accetta testo incollato, Word, txt, rtf, e un PDF digitale il cui testo si può selezionare. Se c’è già del testo, si chiede se sostituirlo o aggiungerlo in fondo. Un PDF solo fotografato o scansionato non viene letto
- Echo può sostituire un passaggio, o ogni occorrenza di un segno (per esempio un trattino lungo), dentro il foglio. L’ultima modifica di Echo si può annullare. Il pezzo cambiato resta in grassetto per pochi secondi, senza essere salvato così
- I file dell’editor che servivano alle nove sezioni fisse sono stati rimossi
- Galleria foto fino a 15 immagini per biografia; il file si controlla e si comprime sul server prima di salvarlo (blocco 4, 6 ottobre 2026)
- Struttura libro: dedica, prefazione, copyright, nota dell'autore
- Cooldown tra capitoli pubblicati (per utenti free, bypassato per staff)
- Cronologia revisioni delle sezioni: il servizio (`lib/revision-history-service.ts`) era usato solo dalla revisione di sezione con IA, tolta il 30 settembre 2026; la colonna `biography_sections.revision_history` resta nel database

**Permanenza e identificativo UM** (su `main`: #52–#58, finestra dati #64)
- Ogni scheda riceve alla creazione un **identificativo UM** immutabile (`lib/um-id.ts`, registro `um_identifiers`, mint server-side). Gli ID emessi non si rigenerano.
- Risolutore stabile `/id/[umId]` (anche forme senza trattini / miste); rewrite `/UM…`; base URL **`UM_ID_BASE_URL`** (server-only, in produzione)
- Specifica pubblica depositata: `docs/UM-IDENTIFIER-SPEC.md` (v1.0, cambio anno in UTC)
- Notazione **Anno UM** (epoca 2026) solo per eventi di archivio: footer, `/credits`, data pubblicazione, colophon PDF, admin, email — mai sulle date di vita
- Schema a eventi, una riga per fatto, sempre legata a `biography_id`: `person_events` (nascita, morte, luoghi di vita con `event_type = residence`) e `person_relations` (etichetta autorevole). I luoghi in più non chiedono una migrazione: `event_type` è testo libero.
- «Salva questi dati» scrive subito nel database di quella scheda (nome su `biographies`, eventi e persone sulle due tabelle). Il testo depositato (txt, docx, intestazione PDF) rilegge tutte le righe di `person_events`, luoghi di vita compresi, quando la scheda va in revisione o si approva il PDF. Salvare la finestra non rigenera da solo un file già depositato.
- Luoghi: l’autore non digita coordinate; riga invariante `nome | lat | lon | WGS 84 | geonames | wikidata` (UNKNOWN sui numeri mancanti); Nominatim con `extratags=1`. Nascita (e morte, solo memoriale) più altri luoghi di vita, con «Aggiungi un luogo».
- Colonne identità scheda: `record_language_tag` / script / direzione, `name_as_written`, diritti, `published_at_iso` + `published_um_year`
- Editor: voce in basso, finestra scorrevole. Autobiografia: «I miei dati» (IT/EN/FR/DE), senza «come la conosci», «come lo sai», nota e sicurezza. Memoriale: «Chi era questa persona» e quelle domande restano, anche sui luoghi in più e sulle persone. La morte non si mostra nell’autobiografia.
- Licenza contenuto scelta dall'autore alla pubblicazione: **CC BY-NC-SA 4.0** (default) o **CC BY-SA 4.0**; upgrade solo 1→2; metadati sempre **CC0** (termini + crediti)
- Export testo UTF-8 invariante per supporti fisici; PDF con intestazione invariante + colophon (senza nuovi font Noto su jsPDF)
- NFC sui percorsi di scrittura principali; `resolveRecordLanguageTag` preferisce `record_language_tag`
- Mappa residua: `docs/piano-permanenza.md`

**Echo — agente conversazionale principale**
- Chat testuale con streaming SSE, storia dei thread persistente
- Voce push-to-talk: STT via Whisper su Infomaniak Edge Function (Svizzera), TTS via Mistral Voxtral API
- Suggerimenti su struttura e modifiche dentro il testo, con memoria del soggetto per le biografie di defunto (memorial)
- Tool `propose_draft`: Echo propone un testo per il foglio unico. Se c’è un passaggio da cambiare, lo sostituisce; altrimenti lo aggiunge in fondo. La card chiede conferma prima di scrivere
- Muting voce, stato orb (idle / listening / thinking / speaking)
- Hub Echo dedicato (`/echo`) separato dall'editor

**Echo dentro il foglio**
- Echo è l’assistente nella barra sotto il foglio. Non propone più una bozza per ciascuna delle nove sezioni
- Una proposta resta entro 1500 parole
- Strumenti ancora presenti: `get_progress`, `read_section` (con `freeflow` legge tutto il foglio), `propose_draft` (scrive nel foglio, anche in sostituzione), `complete_section` e `reopen_section` (segni di completamento rimasti nel codice, non la struttura visibile dell’editor)
- `list_sections` e `update_memory` non esistono più come strumenti. La memoria di conversazione resta in `agent_memory_facts` ed è cancellata alla pubblicazione
- RAG sulla biografia dell'utente (biography_chunks, embeddings su Infomaniak)

**Onboarding e guida piattaforma**
- La guida alla piattaforma non è un agente a sé: è Echo, che risponde alle domande d'uso con la base di conoscenza come contesto. I suoi turni si registrano come `echo` e contano nel tetto dell'autore
- Base di conoscenza della piattaforma in Markdown con sincronizzazione automatica verso `kb_chunks` (indicizzazione con embedding)
- RAG sulla base di conoscenza per rispondere a domande d'uso

**Pubblicazione**
- Flusso approvazione PDF a tre fasi: `draft` → `draft_ai_feedback` → `published`
- Controllo finale prima della stampa (`runPreprintCheck`, a richiesta) e screening di conformità a pezzi (`runPublicationScreening`) con Gemma 4 31B; solo sul server (`/api/publication/preprint-check`, `/api/review/submit`, `/api/publication/approve-final-pdf`, correzione `/api/moderation/resubmit`)
- Revisione manuale moderatori per casi segnalati
- Export PDF avanzato (multi-pagina, con galleria, struttura libro) + intestazione/colophon permanenza
- Export testo semplice UTF-8 (intestazione invariante bilingue)
- Catalogo pubblico con paginazione, filtro per lingua dell'originale, contatori visualizzazioni admin. La traduzione automatica per i lettori è stata tolta: le traduzioni le farà l'autore, in un blocco successivo

**Moderazione e admin**
- Pannello admin: gestione utenti, sospensione, reinstate, assegnazione ruoli
- Segnalazioni lettori con flusso revisione moderatore
- Decisioni di moderazione via API server (non client)
- Accesso staff alle biografie utente per supporto

**Interfaccia, dal 22 al 27 settembre 2026**
- Pagine legali servite dall’applicazione (`/terms-of-service`, `/privacy-policy`, `/cookie-policy`). I testi legali vigenti restano fuori dal repository
- Etichetta BETA accanto al logo; avviso beta una volta dopo ogni accesso
- Menu dell’account completo. Nell’editor gli strumenti stanno sotto una voce sola; Importa testo ed Esporta restano sempre visibili; il collegamento di condivisione si apre da lì
- Badge Pioniere sulle prime 10.000 biografie in ordine di creazione, in catalogo e sopra il titolo
- Il controllo grammaticale chiede prima Apertus 1.5 e, se non risponde, ripiega su Gemma

**Email e comunicazioni**
- Pipeline Resend per email di benvenuto, conferma, reset password
- Logo email, template localizzati, idempotenza invii
- Piè di pagina email con notazione Anno UM

### Infrastruttura e DevOps

**Jelastic**
- App Next.js in container Docker standalone. `Dockerfile` e `.dockerignore` sono su `main` da #51.
- Deploy SSH da GitHub Actions (`JELASTIC_HOST`, `JELASTIC_USER`, `JELASTIC_SSH_KEY`, `JELASTIC_PORT`: secret del workflow, non variabili dell’app, non in `.env.example`).

**Supabase**
- Migrazioni applicate incluso blocco permanenza settembre 2026 (`um_identifiers`, colonne B1, `person_events`, `person_relations`, `biography_flat`, backfill licenze)
- Tabelle agenti: `agent_threads`, `agent_messages`, `agent_memory_facts`, `biography_chunks`, `kb_chunks`, `agent_usage`; consumo dei modelli: `ai_token_usage`, `ai_author_token_limits` (migrazione pronta, da applicare)
- RLS attiva su tutte le tabelle utente
- 5 Edge Functions: `audio-transcription`, `auth-send-email`, `log-error`, `send-engagement-emails`, `user-email-confirmed` (la funzione `ai-assistant` è stata eliminata il 30 settembre 2026)

**Test**
- Vitest in CI: identificativo UM (otto vettori), agenti, pubblicazione, TTS, export permanenza, luoghi, lista d’attesa
- Prove dei componenti (6 ottobre 2026): `jsdom`, `@testing-library/react` e `user-event` come dipendenze di sviluppo. Un test di componente sta in `components/**/__tests__/*.test.tsx` e sceglie il browser simulato con `// @vitest-environment jsdom` in testa al file (gli altri test restano in Node). Primo uso: `PlaceSearchField` dentro una finestra modale di Radix, dove user-event rifiuta il clic su un elemento fuori dal contenuto della finestra (`pointer-events: none` sul body), come succedeva davvero. jsdom è alla serie 26 perché la verifica automatica usa Node 20 e le serie successive richiedono Node 22 o superiore.

---

## Modelli AI in uso

L'intelligenza artificiale lavora sul testo di un autore in quattro casi soltanto: Echo (struttura e modifiche dentro il testo, guida alla piattaforma compresa), il controllo grammaticale su richiesta, il controllo finale prima della stampa e lo screening di conformità prima della pubblicazione (moderazione, non uno strumento dell'autore). Tutto il resto è stato tolto il 30 settembre 2026.

| Funzione | Scopo in `ai_token_usage` | Modello | Ripiego | Dove stanno i dati |
|---|---|---|---|---|
| Echo (testo, strumenti, guida) | `echo` | `google/gemma-4-31B-it` | `mistralai/Ministral-3-14B-Instruct-2512` (pagine di testo: `mistralai/Mistral-Small-4-119B-2603`) | Svizzera, Infomaniak |
| Compressione della memoria dei thread | `memory_compression` | come Echo | come Echo | Svizzera, Infomaniak |
| Controllo grammaticale | `grammar` | `swiss-ai/Apertus-v1.5-70B` | Gemma 4 31B, poi Mistral Small 4 | Svizzera, Infomaniak |
| Controllo finale prima della stampa | `preprint_check` | `google/gemma-4-31B-it` | nessuno (un solo modello) | Svizzera, Infomaniak |
| Screening di conformità | `screening` | `google/gemma-4-31B-it` | `mistralai/Mistral-Small-4-119B-2603` | Svizzera, Infomaniak |
| Indicizzazione e recupero (RAG) | `embedding` | `bge_multilingual_gemma2` (3584 dim) | lo stesso | Svizzera, Infomaniak |
| STT voce Echo | `transcription` (byte del file) | Whisper | — | Svizzera, Edge Function Infomaniak |
| TTS voce Echo | `tts` (caratteri) | Voxtral TTS | — | Francia/UE, Mistral |

**Un solo client**: ogni chiamata a un modello passa da `lib/agents/infomaniak-client.ts` (chat, streaming, embedding) e lascia una riga in `ai_token_usage` (utente, biografia, scopo, modello, `prompt_tokens`, `completion_tokens`, `total_tokens`, indicatore di stima, esito, data). Se l'interfaccia non restituisce `usage` (o rifiuta `stream_options`), il valore è la stima caratteri diviso quattro, marcata come stimata. **Eccezioni, scelte il 30 settembre 2026:** la trascrizione resta una funzione Deno (`audio-transcription`, con il suo flusso asincrono) e scrive da sé la propria riga con il ruolo di servizio. Infomaniak Whisper non restituisce la durata ma solo `file_size` (verificato il 30 settembre 2026): la riga registra quindi i byte del file, senza conversioni in secondi o token; la porterà su Node chi farà la migrazione da Supabase gestito. La sintesi vocale resta su Mistral, non passa da Infomaniak: registra i caratteri inviati, fuori dal tetto in token perché non sono token, e ha il limite di frequenza di prima.

**Misure di consumo per fissare i tetti** (sviluppo, 30 settembre 2026, chiamate vere a Infomaniak con i prompt del codice; token = `total_tokens`): grammatica, dieci testi da 600 a 22.000 caratteri, media 2.187, mediana 1.700, massimo 6.284 (Apertus; i testi tipici di un capitolo, 1.500 a 4.400 caratteri, stanno fra 841 e 1.700). Echo, dieci turni di una conversazione sul foglio libero (prompt di sistema, estratti della biografia e della base di conoscenza, storia che cresce), media 4.428, mediana 3.337, massimo 12.498; un turno senza strumenti costa 2.200 a 3.500 token, quasi tutti di prompt (circa 2.000 sono il prompt di sistema); un turno con chiamate a strumenti costa 5.500 a 12.500 perché ogni giro rilegge tutto il prompt. Le misure dei turni con strumenti sono un minimo: nella prova il database era finto e gli strumenti restituivano risposte brevi. Script: `scripts/misura-consumo-ai.ts`.

**Tetti in token**: tabella `ai_author_token_limits` con tre valori per l'autore (giorno, settimana, mese); nulli = disattivati. Valori iniziali fissati il 30 settembre 2026: 400.000 al giorno, 1.500.000 alla settimana, 4.000.000 al mese. Il conteggio segue i periodi di calendario nel fuso Europe/Zurich (settimana da lunedì). Contano solo `echo` e `grammar`; non contano mai `screening`, `preprint_check`, `embedding`, `memory_compression`. Superato il tetto la rotta risponde 429 con un messaggio nelle quattro lingue che dice quando si riapre. Lo staff è esente ma registrato. I limiti di frequenza esistenti non sono cambiati (Echo: `AGENT_DAILY_LIMIT` e `AGENT_BURST_LIMIT`; grammatica: 5 al minuto, 40 al giorno, 200 alla settimana).

**Nota voce**: solo la sintesi vocale (TTS) è su Mistral Francia. STT e LLM restano in Svizzera. I voice ID per le lingue vanno in `.env` come `ECHO_TTS_VOICE_IT/EN/FR/DE`. I preset Voxtral sono solo EN-US, EN-GB e FR; per IT e DE si usano voci clonate da Mistral Studio.

**Nota Gemma**: resta in uso per Echo, per lo screening, per il controllo finale e come ripiego della grammatica. I pesi sono aperti e l’inferenza è su infrastruttura svizzera (Infomaniak), non su un servizio Google.

Se Apertus non risponde, la grammatica passa a Gemma e poi a Mistral senza un messaggio a chi scrive. Il passaggio resta nei registri e nelle righe di `ai_token_usage` (una per tentativo). Nota: la funzione `ai-assistant` *deployata* in produzione (versione 108) non aveva il modello dedicato alla grammatica e usava Gemma poi Mistral; Apertus per primo era solo nel codice del repository. Con questo blocco la catena del repository (Apertus, Gemma, Mistral) va in produzione per la prima volta: **è un cambio di comportamento voluto** (decisione del 30 settembre 2026), da citare nel resoconto. Quando si porterà la temperatura a 0,2 (commit separato dopo l'unione) il confronto su cinque testi includerà Apertus. Il nome chiamato è `swiss-ai/Apertus-v1.5-70B`. La grammatica gira ora in `POST /api/biography/[id]/grammar` (Node): stessi modelli, ordine e parametri di prima (temperatura 0,7, 2048 token di risposta, 45 secondi, tre tentativi); il testo non si tronca più in silenzio, sopra 30.000 caratteri la rotta rifiuta con un messaggio nelle quattro lingue.

**Licenza**: i pesi Voxtral sono CC-BY-NC. "Gratis per gli utenti" non equivale a "non commerciale" — si usano le API a pagamento, non si auto-ospitano i pesi.

---

## Piani in corso o aperti

### Piano permanenza / UM — `docs/piano-permanenza.md`

**Chiuso** (4 settembre 2026). Fondamenta + editor + licenza + export testo/PDF + notazione UM in UI + backfill. Debito tracciato: motore PDF non-latino, ritiro `content_language`, NFC residuo, mappature esterne (§9 non ora).

### Piano Echo voce Voxtral — `.cursor/plans/echo_voce_voxtral.plan.md`

Swap del layer TTS da Kokoro (Docker self-hosted, eliminato) a Voxtral TTS via API Mistral. Il piano è isolato: tocca solo il TTS, non lo STT né la logica di Echo.

Stato: **in corso** (dipende dalla configurazione dei voice ID in `.env`).

File chiave già modificati: `lib/echo/voxtral-tts.ts` (nuovo), `app/api/agents/echo/tts/route.ts`, `lib/echo/voice-config.ts`, `lib/echo/echo-playback.ts`, `docs/ECHO_VOICE.md`.

File da NON toccare: `lib/echo/whisper-stt.ts`, `supabase/functions/audio-transcription/`, `components/echo/EchoVoiceSession.tsx`.

Voice ID da configurare:
```
ECHO_TTS_VOICE_EN=gb_oliver_neutral   # preset British English
ECHO_TTS_VOICE_FR=<preset francese>   # da recuperare da Mistral Studio
ECHO_TTS_VOICE_IT=<UUID voice clonata> # clonata da Mistral Studio (nativa italiana)
ECHO_TTS_VOICE_DE=gb_oliver_neutral   # cross-lingua per ora, migliorabile
```

### Piano Fase 1 agenti — `.cursor/plans/fase1_agenti_supabase_dettagliato.plan.md`

Tutti e 9 gli step sono marcati `completed`. La Fase 1 è terminata.

### Piano prevenzione disco Jelastic

Unito in `main` con #51 (immagine standalone + prune). Non è più un ramo da mergiare.

### Piano Markdown d’archivio e segnalazioni a tre corsie

**Chiuso nel codice** (settembre 2026): tre corsie di segnalazione, `provisional_until` per il memorial, pacchetto d’archivio.

### Blocco 2: Markdown come origine (6 ottobre 2026, ramo `blocco-2-markdown`)

**Decisione fissa**: l’originale della biografia è Markdown CommonMark UTF-8 (NFC). L’HTML esiste solo come resa al momento (`storedToSafeHtml` / TipTap), con HTML grezzo disattivato nel parser. Editor TipTap 3.19 + `@tiptap/markdown@3.19.0`; salvataggio tramite serializzatore d’archivio (`lib/archive-markdown.ts`) con escape dei caratteri significativi e separatore di scena `***`. Fuori dall’editor: sottolineato, colori, evidenziazione, barrato, codice, tabelle, immagini nel corpo, attributi `style`. Preferenza `editor_font_size` solo UI; PDF tipografia fissa (`PT_*`).

**Resa unica**: pagina pubblica (anche foglio libero), anteprima revisore, PDF, esporti, archivio, screening e impronta leggono la stessa fonte Markdown. Test di allineamento `lib/__tests__/author-text-columns-sync.test.ts` tra SQL `biographies_author_text_columns()`, costante TypeScript e colonne dell’impronta.

**Migrazione dati**: tabella `biography_source_html_legacy` applicata in produzione (`20261006140000` + `20261006140100` per `reason` / `previous_record_id` su `publication_records`). Conserva l’HTML precedente 180 giorni, RLS senza policy, solo `service_role`, indice su `biography_id`, univoca su `(biography_id, source_column, coalesce(entry_id,''))`, `purge_after` default `now() + 180 days`. Il comando `npm run markdown:legacy -- --apply` scrive solo lì (mai in `content_html_legacy`) e, per le pubblicate, una riga di screening «conversione di formato, contenuto invariato». **`content_html_legacy`**: in produzione è vuota (0/19 schede); non usata dal nuovo comando; **da eliminare insieme a `biography_source_html_legacy` dopo i 180 giorni** dalla conversione reale. **Data di svuotamento**: da annotare al via del passo 4 (conversione + 180 giorni). Conversione reale ancora in attesa della frase di via.

### Fase 2 — migrazione Infomaniak Public Cloud (rinviata)

Non ancora iniziata. Richiede aiuto professionale. Includerà: PostgreSQL con pgvector su Docker (il DBaaS gestito Infomaniak non ha pgvector di default), Kubernetes gestito, object storage S3, auth self-gestita. Jelastic escluso come destinazione dati per il limite 100 GB/nodo.

---

## Decisioni architetturali fisse

- **Nessun self-hosting GPU**: l'inferenza AI resta sempre su API Infomaniak gestita. Il self-hosting su GPU è un'opzione futura (Fase 2+) se si supera la soglia del rate limit condiviso.
- **Supabase resta in Fase 1**: database, auth, storage rimangono su Supabase per la beta. Nessuna migrazione fino alla Fase 2.
- **Streaming SSE via Node.js**: le route agenti girano su runtime Node (non Edge) per il supporto streaming. La scelta è verificata nel `next.config.js`.
- **Memoria di Echo alla pubblicazione**: alla prima pubblicazione riuscita e a ogni pubblicazione successiva, le rotte server che pubblicano (`/api/review/submit` e `/api/publication/approve-final-pdf` tramite lo screening, `/api/admin/biographies/action`, le decisioni di moderazione) cancellano thread, messaggi, `agent_memory_facts` e `biography_chunks` di quella biografia (`purgeAgentMemoryForBiography`), solo dopo che la scrittura dello stato `published` è riuscita. Le righe di `ai_token_usage` restano: non contengono testo. Fino al 30 settembre 2026 il codice cancellava solo i `biography_chunks` (e i thread dei tipi di agente tolti), non le conversazioni di Echo. Il thread generale di Echo dell'utente, quello senza biografia, non è toccato.
- **Testo per stato, elenco chiuso**: l'autore scrive il testo solo in `draft`, `sections_complete`, `final_version`, `pdf_draft`, `revision_requested` (funzione SQL `author_text_writable_statuses()` e costante `AUTHOR_TEXT_WRITABLE_STATUSES` in `lib/publication-state.ts`, confrontate da un test). Si cambia l'elenco solo di proposito, in entrambi i posti.
- **Impronta del testo alla pubblicazione**: il testo che va online è esattamente quello che lo screening ha esaminato. Quando lo screening esamina una scheda, `publication_records` riceve l'impronta SHA-256 del testo come lo vedrà il pubblico (pagina, PDF, archivio: titolo e nomi, `content`, flusso libero, `final_version`, sezioni, parti del libro attive, didascalie, eventi, relazioni; normalizzati in Markdown d'archivio e NFC), quanti caratteri ha visto il modello (`examined_chars`) e quanti ne aveva il testo di partenza (`source_chars`). Ogni percorso del server che porta una scheda a `published` passa da `gatedPublish` (`lib/server/publication-fingerprint.ts`): ricalcola l'impronta e, se è diversa, non pubblica, rimette la scheda in coda con un errore esplicito e lascia una riga `text_changed`. Modi: `auto` (dopo lo screening: l'impronta di prima del modello deve essere quella di adesso; il controllo precede l'emissione dell'identificativo UM), `human_approval` (approvazione dello staff e decisione di moderazione: deve esistere uno screening registrato di esattamente questo testo, altrimenti si rilancia lo screening), `restore` (ricorso accolto che riporta a `published`: il testo deve essere quello dell'ultima pubblicazione) e `forced` (pubblicazione forzata dello staff: nessun confronto, ma impronta e autore sono scritti **prima** dello stato e, se non si riesce a scriverli, non si pubblica). Un test vieta percorsi nuovi che scrivano `status: 'published'` senza `gatedPublish`. `content` e `final_version` sono ancora due campi distinti (nelle 11 schede pubblicate il testo di `content` è contenuto in `final_version`, che in più ha i titoli delle sezioni; non sono uguali byte per byte): entrano tutti e due nell'impronta. La loro unificazione vera è rimandata al blocco Markdown. **Regola provvisoria sui testi lunghi (fino al blocco sullo screening)**: il modello di screening riceve al massimo i primi 6000 caratteri del testo (`MAX_CONTENT_CHARS`). Se `examined_chars` è minore di `source_chars`, niente pubblicazione automatica: la scheda passa alla coda umana con il motivo scritto nel rapporto ("Text longer than the screening window", con i caratteri letti e quelli totali) e l'autore riceve un avviso. Così, fino all'esame completo a pezzi, non esiste un testo pubblicato in automatico senza che il modello l'abbia visto tutto. Le 11 schede pubblicate sono tutte sotto i 1100 caratteri e non sono toccate; una biografia vera supera quasi sempre il limite e quindi passa da una persona. Lo screening legge ora sempre il testo intero: le sezioni mirate dopo un rifiuto dello staff sono state tolte, perché una garanzia sul testo pubblicato non può poggiare su una parte sola.
- **Documento unico**: la biografia è un solo foglio. L’editor non offre più le nove sezioni né il testo libero come scelta. Echo lavora su quel documento. Il campo `biography_mode` resta nel database per le schede già scritte con il valore `sections`: l’interfaccia, aprendole, le tratta come foglio unico e non lo toglie con una migrazione.
- **Full-duplex voce rinviato**: Pipecat / LiveKit e barge-in sono Fase 2. La beta usa push-to-talk.
- **Identificativo permanente UM**: emesso da Biography Library, specifica pubblica vincolante; non ARK; mai riciclato; mai 404 su ID emesso.
- **Licenza contenuto pubblica**: scelta dell'autore (BY-NC-SA default / BY-SA); metadati sempre CC0; upgrade solo unidirezionale in UI.
- **Anno UM**: solo eventi di archivio (pubblicazione, crediti, colophon); cambio anno in UTC; mai sulle date di vita.
- **PDF attuale**: non aggiungere famiglie Noto a jsPDF; scritture non latine richiedono un motore diverso (subsetting).
- **Memorial, 30 giorni**: restano (Manifesto e condizioni, fuori repo). In codice: colonna `provisional_until` quando esisterà, non uno stato `provisional`. La segnalazione resta possibile dopo la scadenza, per sempre.
- **Formato di riferimento (origine)**: l’originale conservato della biografia è Markdown CommonMark in UTF-8 (NFC), decisione chiusa nel blocco 2 (6 ottobre 2026). Si salva, si modifica, si versiona e si esporta come Markdown; l’HTML è solo resa generata al momento (parser con HTML grezzo disattivato). Separatore di scena canonico: `***`. Il PDF è una resa, non l’originale. Da qui dipendono archivio, copie di sicurezza, esportazioni e conservazione fisica.
- **Originale d’archivio**: pacchetto `archive/{UM}/v{N}/` nel bucket privato `archive`. Autobiografia: v1 alla pubblicazione. Memorial: v1 solo dopo `provisional_until` (30 giorni), via `POST /api/cron/archive-packages`. Il manifesto non contiene la propria impronta. `erasePriorContent` toglie la versione precedente da storage, HTML legacy, cronologia, PDF esportati e chunk; dice al segnalante che le copie già scaricate non si ritirano. Le versioni già depositate non si riscrivono.

---

## Variabili d'ambiente critiche

```
# Infomaniak AI Services
INFOMANIAK_AI_ENDPOINT=...      # completions endpoint (legacy, punta a /chat/completions)
INFOMANIAK_AI_BASE_URL=...      # root URL per derivare /models, /embeddings
INFOMANIAK_PRODUCT_ID=...

# Grammatica (prima Edge Function, ora Next.js: stessi nomi e valori di prima)
# INFOMANIAK_AI_MODEL_GRAMMAR / _PRIMARY / _FALLBACK, AI_RATE_LIMIT, AI_DAILY_LIMIT, AI_WEEKLY_LIMIT

# Mistral (solo TTS voce)
MISTRAL_API_KEY=...

# Voice ID Echo (Voxtral TTS)
ECHO_TTS_VOICE_IT=...
ECHO_TTS_VOICE_EN=gb_oliver_neutral
ECHO_TTS_VOICE_FR=...
ECHO_TTS_VOICE_DE=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Permanenza / UM
UM_ID_BASE_URL=https://id.biographylibrary.org
# GEONAMES_USERNAME=...         # opzionale; altrimenti Nominatim per i luoghi

# Email
RESEND_API_KEY=...
```

---

## Struttura del repository (parti rilevanti)

```
app/
  api/
    agents/         # route SSE per chat, Echo TTS, apply-draft
    publication/    # flusso approvazione PDF
    admin/          # moderazione, gestione utenti
    biography/      # API biography (galleria, grammatica, modalità, create+mint UM)
    places/         # ricerca località (GeoNames/Nominatim)
  biography/[id]/   # editor a foglio unico + pannello permanenza
  id/[umId]/        # risolutore identificativo UM
  credits/          # Anno UM + nota CC0 metadati
  echo/             # hub Echo
  login/            # accesso (la home `/` è la lista d’attesa)
  waitlist/         # holding: sola data di registrazione
  admin/            # pannello moderatori e staff

lib/
  server/photo-processing.ts / photo-storage.ts / photo-recompression.ts   # foto: elaborazione sharp, bucket, ricompressione
  um.ts / um-id.ts / edtf.ts / rights.ts / nfc.ts / record-language.ts
  permanence-text-export.ts   # export testo + linee header/colophon PDF
  person-events.ts / person-relations.ts
  agents/                     # Echo, RAG, screening, client unico verso Infomaniak
  ai/                         # grammatica, limiti, registro del consumo, tetti in token
  echo/                       # STT Whisper, TTS Voxtral
  server/um-id-registry.ts    # mint UM

supabase/
  migrations/        # include blocco 20260904* permanenza
  functions/         # 5 Edge Functions

components/
  editor/permanence/   # finestra dati: date EDTF, luoghi di vita, provenienza solo memoriale
  editor/LicenseChoiceDialog.tsx / AuthorLicensePanel.tsx
  echo/
  export/
```

---

*Ultimo aggiornamento: 6 ottobre 2026 (blocco 4, foto elaborate sul server)*
