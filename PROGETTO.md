# Biography Library — stato del progetto

> Documento di contesto per Claude Projects. Riassume le decisioni prese, ciò che è implementato e ciò che è in corso, in modo che ogni nuova sessione parta allineata senza ripetere il pregresso.
>
> **Aggiornare** questo file quando si completa un piano significativo o si prendono decisioni architetturali nuove. Vedi `scripts/update-project-doc.sh` per l'aggiornamento assistito.

---

## Cos'è Biography Library

Piattaforma web che aiuta le persone a scrivere la propria biografia (o quella di un defunto) in modo guidato, con supporto AI. L'utente scrive in sezioni, riceve aiuto da un agente conversazionale (coach), può pubblicare la biografia come PDF e condividerla nel catalogo pubblico.

Fondatore unico, non sviluppatore: costruisce con Claude Code e Cursor. Non ci sono altri collaboratori tecnici. Le scelte architetturali privilegiano servizi gestiti (Supabase, Infomaniak, Jelastic) e piani completabili in autonomia.

**Stack attuale**: Next.js 14 App Router · Supabase (Postgres, Auth, Storage, pgvector) · Jelastic (hosting) · Infomaniak AI Services (inferenza LLM) · Mistral La Plateforme (TTS voce)

---

## Stato dell'implementazione (21 settembre 2026)

### Funzionalità utente completate

**Autenticazione e profilo**
- Registrazione, login, reset password, verifica email con Resend
- Lista d’attesa beta: la home `/` è la landing; login su `/login`; i nuovi account nascono `waitlist`; holding con sola data di registrazione; admin concede l’accesso in blocco
- Blocco lingua alla registrazione: l'utente sceglie IT/EN/FR/DE e l'app usa quella lingua per tutte le email transazionali
- Onboarding obbligatorio con wizard a passaggi e tour guidato della piattaforma (anche mobile) — solo dopo l’accesso
- Impostazioni profilo e notifiche

**Creazione e scrittura biografia**
- Due modalità: autobiografia (soggetto vivo, narratore = soggetto) e biografia di defunto (memorial)
- Modalità sezioni: 9 sezioni tematiche strutturate, con stato di completamento per ciascuna
- Importazione testo (incolla testo grezzo → parser distribuisce nelle sezioni)
- Galleria foto fino a 30 immagini per biografia
- Struttura libro: dedica, prefazione, copyright, nota dell'autore
- Cooldown tra capitoli pubblicati (per utenti free, bypassato per staff)
- Cronologia revisioni

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
- Coaching biografico per modalità sezioni e memoria soggetto (memorial)
- Tool `propose_draft`: Echo propone un testo per la sezione corrente e lo mostra come card nell'editor senza ricaricare la pagina
- Muting voce, stato orb (idle / listening / thinking / speaking)
- Hub Echo dedicato (`/echo`) separato dall'editor

**Coach narrativo**
- Agente separato da Echo, accessibile dalla barra strumenti dell'editor
- Proposta di bozze per le 9 sezioni, max 1500 parole per proposta
- Tool calling: `propose_draft`, `read_section`, `list_sections`, `update_memory`
- Memoria a lungo termine (agent_memory_facts), cancellata alla pubblicazione
- RAG sulla biografia dell'utente (biography_chunks, embeddings su Infomaniak)

**Onboarding e guida piattaforma**
- Agente Platform Guide (sostituisce il vecchio HelpChatbot) su Nemotron
- Knowledge base della piattaforma in Markdown con sincronizzazione automatica verso kb_chunks
- RAG sulla KB per rispondere a domande d'uso

**Pubblicazione**
- Flusso approvazione PDF a tre fasi: `draft` → `draft_ai_feedback` → `published`
- Revisione AI con Apertus-70B (screening testo per qualità e moderazione)
- Revisione manuale moderatori per casi segnalati
- Export PDF avanzato (multi-pagina, con galleria, struttura libro) + intestazione/colophon permanenza
- Export testo semplice UTF-8 (intestazione invariante bilingue)
- Catalogo pubblico con paginazione, traduzione on-demand, contatori visualizzazioni admin

**Moderazione e admin**
- Pannello admin: gestione utenti, sospensione, reinstate, assegnazione ruoli
- Segnalazioni lettori con flusso revisione moderatore
- Decisioni di moderazione via API server (non client)
- Accesso staff alle biografie utente per supporto

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
- Tabelle agenti: `agent_threads`, `agent_messages`, `agent_memory_facts`, `biography_chunks`, `kb_chunks`, `agent_usage`
- RLS attiva su tutte le tabelle utente
- 6 Edge Functions: `audio-transcription`, `ai-assistant`, `auth-send-email`, `log-error`, `send-engagement-emails`, `user-email-confirmed`

**Test**
- Vitest in CI: identificativo UM (otto vettori), agenti, pubblicazione, TTS, export permanenza, luoghi, lista d’attesa

---

## Modelli AI in uso

| Funzione | Modello | Provider | Posizione dati |
|---|---|---|---|
| Coach narrativo | Mistral Small 4 (o equivalente slug Infomaniak) | Infomaniak AI Services | Svizzera |
| Reviewer / screening | Mistral Small 4 | Infomaniak AI Services | Svizzera |
| Onboarding / Platform Guide | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` | Infomaniak AI Services | Svizzera |
| Rilettura sovrana (opzionale) | `swiss-ai/Apertus-70B-Instruct-2509` | Infomaniak AI Services | Svizzera |
| Echo LLM (chat + tool) | Mistral (via Infomaniak) | Infomaniak AI Services | Svizzera |
| STT voce Echo | Whisper | Infomaniak Edge Function | Svizzera |
| TTS voce Echo | Voxtral TTS (`voxtral-tts-minimax`) | Mistral La Plateforme | Francia/EU |
| Embeddings RAG | `bge_multilingual_gemma2` (3584 dim, halfvec) | Infomaniak AI Services | Svizzera |

**Nota voce**: solo la sintesi vocale (TTS) è su Mistral Francia. STT e LLM restano in Svizzera. I voice ID per le lingue vanno in `.env` come `ECHO_TTS_VOICE_IT/EN/FR/DE`. I preset Voxtral sono solo EN-US, EN-GB e FR; per IT e DE si usano voci clonate da Mistral Studio.

**Nota Gemma**: rimossa a giugno 2026 — il coach era originalmente previsto su `google/gemma-4-31B-it`, poi consolidato su Mistral per uniformità e per eliminare dipendenze da Google.

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

Aperto. Originale conservato = Markdown UTF-8; tre corsie di segnalazione; `provisional_until` per memorial. La conversione dell’HTML già salvato è in prova: colonna `content_html_legacy` e `npm run markdown:legacy -- --dry-run` (nessuna sovrascrittura; le schede pubblicate con perdita restano per la revisione a mano). Tour di onboarding: voce «I miei dati» o «Chi era questa persona» sul pulsante in basso. Nella finestra il salvataggio resta visibile e l’elenco luoghi non viene tagliato. Non toccare termini e manuale operativo (vivono fuori repo). Dettaglio: piano Cursor `archivio_md_e_segnalazioni`.

### Fase 2 — migrazione Infomaniak Public Cloud (rinviata)

Non ancora iniziata. Richiede aiuto professionale. Includerà: PostgreSQL con pgvector su Docker (il DBaaS gestito Infomaniak non ha pgvector di default), Kubernetes gestito, object storage S3, auth self-gestita. Jelastic escluso come destinazione dati per il limite 100 GB/nodo.

---

## Decisioni architetturali fisse

- **Nessun self-hosting GPU**: l'inferenza AI resta sempre su API Infomaniak gestita. Il self-hosting su GPU è un'opzione futura (Fase 2+) se si supera la soglia del rate limit condiviso.
- **Supabase resta in Fase 1**: database, auth, storage rimangono su Supabase per la beta. Nessuna migrazione fino alla Fase 2.
- **Streaming SSE via Node.js**: le route agenti girano su runtime Node (non Edge) per il supporto streaming. La scelta è verificata nel `next.config.js`.
- **Memoria agenti cancellata alla pubblicazione**: `agent_threads`, `agent_messages`, `agent_memory_facts` e `biography_chunks` vengono purgati quando la biografia passa a `published` (`purgeAgentMemoryOnPublished`).
- **Coach solo su `biography_mode = sections`**: la modalità freeflow è esclusa dalla beta. Se l'utente tenta, l'agente lo reindirizza.
- **Full-duplex voce rinviato**: Pipecat / LiveKit e barge-in sono Fase 2. La beta usa push-to-talk.
- **Identificativo permanente UM**: emesso da Biography Library, specifica pubblica vincolante; non ARK; mai riciclato; mai 404 su ID emesso.
- **Licenza contenuto pubblica**: scelta dell'autore (BY-NC-SA default / BY-SA); metadati sempre CC0; upgrade solo unidirezionale in UI.
- **Anno UM**: solo eventi di archivio (pubblicazione, crediti, colophon); cambio anno in UTC; mai sulle date di vita.
- **PDF attuale**: non aggiungere famiglie Noto a jsPDF; scritture non latine richiedono un motore diverso (subsetting).
- **Memorial, 30 giorni**: restano (Manifesto e condizioni, fuori repo). In codice: colonna `provisional_until` quando esisterà, non uno stato `provisional`. La segnalazione resta possibile dopo la scadenza, per sempre.
- **Originale d’archivio** (cantiere aperto): pacchetto Markdown UTF-8; il PDF è una resa.

---

## Variabili d'ambiente critiche

```
# Infomaniak AI Services
INFOMANIAK_AI_ENDPOINT=...      # completions endpoint (legacy, punta a /chat/completions)
INFOMANIAK_AI_BASE_URL=...      # root URL per derivare /models, /embeddings
INFOMANIAK_PRODUCT_ID=...

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
    biography/      # API biography (galleria, traduzione, modalità, create+mint UM)
    places/         # ricerca località (GeoNames/Nominatim)
  biography/[id]/   # editor con sidebar sezioni + pannello permanenza
  id/[umId]/        # risolutore identificativo UM
  credits/          # Anno UM + nota CC0 metadati
  echo/             # hub Echo
  login/            # accesso (la home `/` è la lista d’attesa)
  waitlist/         # holding: sola data di registrazione
  admin/            # pannello moderatori e staff

lib/
  um.ts / um-id.ts / edtf.ts / rights.ts / nfc.ts / record-language.ts
  permanence-text-export.ts   # export testo + linee header/colophon PDF
  person-events.ts / person-relations.ts
  agents/                     # coach, Echo, RAG, screening
  echo/                       # STT Whisper, TTS Voxtral
  server/um-id-registry.ts    # mint UM

supabase/
  migrations/        # include blocco 20260904* permanenza
  functions/         # 6 Edge Functions

components/
  editor/permanence/   # finestra dati: date EDTF, luoghi di vita, provenienza solo memoriale
  editor/LicenseChoiceDialog.tsx / AuthorLicensePanel.tsx
  agents/AgentChat.tsx
  echo/
  export/
```

---

*Ultimo aggiornamento: 21 settembre 2026*
