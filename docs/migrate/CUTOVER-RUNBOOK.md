# Runbook — giorno del passaggio Irlanda → Zurigo

Progetto destinazione: `frycyhvhuifznxzamenn` (eu-central-2).  
Sorgente (sola lettura fino allo spegnimento): `gckmusbozgbclokvbnwx`.

PR cutover app (da unire **solo** al momento giusto): ramo `feat/zurich-cutover`.  
Script migrate: già in `main` (PR #153). Dump sotto `var/migrate-dumps/` (gitignored).

Credenziali DB: solo `read -s` nel terminale della prova — mai in file o chat.

```bash
read -s MIGRATE_SOURCE_DB_URL && export MIGRATE_SOURCE_DB_URL
read -s MIGRATE_DEST_DB_URL && export MIGRATE_DEST_DB_URL
export MIGRATE_DUMP_DIR="var/migrate-dumps/$(date -u +%Y%m%d-%H%M)-cutover"
# API storage (service role), quando serve copy-storage:
# read -s MIGRATE_SOURCE_SERVICE_KEY && export MIGRATE_SOURCE_SERVICE_KEY
# read -s MIGRATE_DEST_SERVICE_KEY && export MIGRATE_DEST_SERVICE_KEY
# export MIGRATE_SOURCE_URL='https://gckmusbozgbclokvbnwx.supabase.co'
# export MIGRATE_DEST_URL='https://frycyhvhuifznxzamenn.supabase.co'
```

---

## Sequenza

### 0. Congelamento e preflight

| | |
|--|--|
| **Comando** | `node scripts/migrate/preflight.mjs` |
| **Atteso** | `pg_dump` / `pg_restore` / `psql` ≥ 17 |
| **Stop** | Tool mancanti o troppo vecchi → installare client 17, non proseguire |

Schema già presente su Zurigo dalla prova: **non** rieseguire `build-baseline` / `apply-baseline` salvo reset completo (`reset-dest`).

### 1. Manutenzione ON

| | |
|--|--|
| **Comando** | Aprire `https://app.biographylibrary.org/admin` (cookie bypass), poi pannello «Manutenzione» → accendi |
| **Atteso** | Visitatori vedono pagina 503; `/admin` e cron restano raggiungibili |
| **Stop** | Manutenzione non attiva → non cambiare env Jelastic |

### 2. Dump Irlanda (sola lettura)

| | |
|--|--|
| **Comando** | `node scripts/migrate/dump-source.mjs` |
| **Atteso** | `data.dump` + `public-schema.sql`; `pg_restore --list` con TABLE DATA public ≥ 1; `row-counts.json` |
| **Stop** | Errore dump o zero TABLE DATA public → non restore |

### 3. Restore dati su Zurigo

| | |
|--|--|
| **Comando** | `MIGRATE_DUMP_DIR=… node scripts/migrate/restore-dest.mjs --apply` |
| **Atteso** | Fine senza errore; sequenze riallineate; `ANALYZE` |
| **Stop** | Fallimento `session_replication_role` o psql → **non** improvvisare SQL; correggere script/privilegi e ripetere (truncate+restore è ripetibile) |

### 4. Verify conteggi + checksum

| | |
|--|--|
| **Comando** | `node scripts/migrate/verify-counts.mjs` |
| **Atteso** | `OK: zero differences` |
| **Stop** | Qualsiasi diff → riportare tabella/kind/source/dest; non correggere a mano |

### 5. Copia Storage

| | |
|--|--|
| **Comando** | `node scripts/migrate/copy-storage.mjs` (con URL API + service keys) |
| **Atteso** | Oggetti copiati sui tre bucket |
| **Stop** | Errori di upload/list → fermarsi prima di verify-storage / rewrite URL |

### 6. Verify Storage (hash)

| | |
|--|--|
| **Comando** | `MIGRATE_VERIFY_HASH=1 node scripts/migrate/verify-storage.mjs` |
| **Atteso** | Zero file mancanti / hash diversi |
| **Stop** | Diff → non rewrite URL e non unire la PR app |

### 7. Rewrite URL Storage nel DB Zurigo

| | |
|--|--|
| **Comando** | `node scripts/migrate/rewrite-storage-urls.mjs --apply` |
| **Atteso** | Prima: ~media 76, export_txt 10, export_docx 10, final_pdf 8, listing_cover 0 (host Irlanda); dopo: **0** righe con host Irlanda |
| **Stop** | Restano host Irlanda → non deploy app |

La riscrittura gira in transazione con `SET LOCAL session_replication_role = replica` così i trigger (es. aggiornamento di `updated_at`) non modificano le date delle righe durante la sostituzione dell’host.

Dry-run consigliato: `node scripts/migrate/rewrite-storage-urls.mjs --dry-run`.

### 8. Variabili su Jelastic (`/opt/bl-app/.env`) + rebuild

Chiavi che puntano a Supabase (cercate nel codice):

| Variabile | Uso |
|-----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + middleware + Whisper (`*.supabase.co` del progetto) — **Zurigo** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client / middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Route server, bypass manutenzione HMAC, Edge auto |
| `CRON_SECRET` | Cron Next + `run-engagement-cron.sh` → Edge `send-engagement-emails` — **stesso valore** già in `.env` e nei secret Edge Zurigo |

Opzionale per il cron shell: `SUPABASE_PROJECT_REF=frycyhvhuifznxzamenn` (default Zurigo se assente; oppure lasciare `NEXT_PUBLIC_SUPABASE_URL` e lo script deriva l’URL della function).

Altre variabili app (Infomaniak AI, `NEXT_PUBLIC_APP_URL`, `UM_ID_BASE_URL`, …) **non** cambiano progetto Supabase: lasciarle come sono salvo se già tipate all’Irlanda per errore.

| | |
|--|--|
| **Comando** | Aggiornare `.env` su Jelastic; le `NEXT_PUBLIC_*` richiedono **nuova build/deploy** (non basta restart) |
| **Atteso** | File salvato; nessuna password in chat |
| **Stop** | Non unire la PR finché env Zurigo non è scritto |

### 9. Unire la PR cutover e attendere la build

| | |
|--|--|
| **Comando** | Merge (squash) di `feat/zurich-cutover` → `main`; attendere GitHub Actions → Jelastic |
| **Atteso** | Deploy verde; app risponde dietro manutenzione |
| **Stop** | CI/deploy rosso → non spegnere manutenzione; rollback env se necessario |

Contenuto tipico PR: header `x-region: eu-central-2` su Whisper; CORS Edge; cron/email script su progetto da env; `rewrite-storage-urls`; questo runbook.

Dopo il deploy: ridistribuire Edge Functions su **Zurigo** se non già allineate (`audio-transcription` con `x-region` in CORS, `auth-send-email`, `send-engagement-emails`, …).

### 10. Prove smoke (con manutenzione ancora ON, da `/admin` o bypass)

| Prova | Atteso |
|-------|--------|
| Accesso / login | Sessione Auth Zurigo |
| Foto (upload/view) | URL `frycyhvhuifznxzamenn.supabase.co` |
| PDF export | Download ok |
| Voce (Whisper) | Trascrizione ok (header `x-region`) |
| Mail (reset / engagement se testabile) | Hook / function Zurigo |

| **Stop** | Qualsiasi fallimento critico → § Ripristino |

### 11. Manutenzione OFF

| | |
|--|--|
| **Comando** | Pannello admin → spegni manutenzione |
| **Atteso** | Sito pubblico raggiungibile |
| **Stop** | — |

### 12. Post

- Irlanda in pausa ≥ 30 giorni (non cancellare subito).
- Cifrare dump: `docs/migrate/DUMPS.md`.
- `unset MIGRATE_SOURCE_DB_URL MIGRATE_DEST_DB_URL` (e chiavi API) nel terminale.

---

## Ripristino (problemi dopo il cutover app)

1. **Env Jelastic** → di nuovo URL/chiavi **Irlanda** + rebuild/deploy.
2. Sul DB Zurigo (se gli URL erano già riscritti):  
   `node scripts/migrate/rewrite-storage-urls.mjs --apply --reverse`  
   (atteso: 0 righe con host Zurigo nelle colonne tracciate).
3. Manutenzione: lasciare ON finché Irlanda non è di nuovo la sorgente live dell’app.
4. Non cancellare Zurigo: resta laboratorio / secondo tentativo.

---

## Riferimenti

- Checklist sintetica: `docs/migrate/CUTOVER-CHECKLIST.md`
- Congelamento schema: `docs/migrate/SCHEMA-FREEZE.md`
- Script: `scripts/migrate/README.md`
- Deploy / env: `DEPLOYMENT.md`
