# Stato della priorità zero — 21 settembre 2026

Documento di passaggio di consegne. Dice dove siamo davvero, cosa ho verificato
io e cosa resta da fare, distinguendo ciò che si fa da codice da ciò che si fa
solo in produzione con le credenziali.

---

## In una riga

**La priorità zero non è bloccata: il risolutore in produzione funziona.** Il
500 che l'aveva fatta dichiarare bloccante non è più riproducibile. Restano due
verifiche che richiedono l'accesso alla produzione e un punto di codice aperto.

---

## 1. Il 500 non c'è più

Ho interrogato `id.biographylibrary.org` il 21 settembre. Risultati misurati,
non dedotti:

| Richiesta | Risposta | Atteso |
| --------- | -------- | ------ |
| `/UM-0000-K3NQ-7FX2-MVP4` | 404 | 404, è un vettore di prova mai emesso |
| `/id/UM-0000-K3NQ-7FX2-MVP4` | 404 | 404, stesso motivo |
| `/UM-9999-XXXX-XXXX-XXXX` | 404 | 404, carattere di controllo errato |

Nessun 500. Il sottodominio `id` punta già all'applicazione Next.js: la pagina
di errore servita è quella dell'applicazione, non del server web, e il
middleware riscrive correttamente la forma senza `/id/`.

Il motivo più probabile è che il 500 precedesse il deploy di
[#52](https://github.com/BiographyLibrary/Biography-Library/pull/52), che è
stato unito in `main` il 19 settembre (commit `c685abf`) e porta il risolutore,
il registro e le migrazioni `20260904*`. Se le migrazioni non fossero state
applicate, oggi vedremmo ancora un errore sulla tabella mancante.

**Resta da verificare, e serve la produzione:** che un identificativo
realmente emesso risponda, cioè il caso «identificativo emesso: mai 404». Non
posso farlo perché non conosco un identificativo emesso e non ho accesso al
database. È l'ultimo punto dello smoke.

---

## 2. Checklist operativa, riga per riga

| Punto | Stato | Nota |
| ----- | ----- | ---- |
| Deploy Jelastic del merge #52 | **fatto** | `c685abf` è su `main` dal 19 settembre e il codice risponde in produzione |
| Migrazioni `20260904*` | **quasi certamente applicate** | se mancassero, il risolutore darebbe errore sulla tabella `um_identifiers` invece di 404 pulito; conferma con la query in fondo |
| `scripts/backfill-um-ids.mjs` | **da verificare** | serve una query, vedi sotto |
| Sottodominio `id` → app Next | **fatto** | verificato dalle risposte HTTP |
| Variabile base URL | **da rifare con il nome nuovo** | vedi il riquadro qui sotto |

### Attenzione: la variabile ha cambiato nome

La checklist dice `NEXT_PUBLIC_UM_ID_BASE_URL`. Quel nome è **superato** dal
lavoro sul ramo `feat/um-permanence`, non ancora unito.

- Su `main` (produzione oggi): la variabile non è letta da nessuno, perché
  `lib/um-id-url.ts` non era importato da alcun file. Impostarla o meno non
  cambia il comportamento.
- Sul ramo: si chiama **`UM_ID_BASE_URL`**, senza prefisso, ed è obbligatoria.
  Il codice solleva un errore se manca, di proposito: l'indirizzo finisce
  dentro documenti depositati che non si correggono più.

**Quindi:** quando il ramo verrà unito, su Jelastic va impostata
`UM_ID_BASE_URL=https://id.biographylibrary.org` e va tolta la vecchia
`NEXT_PUBLIC_UM_ID_BASE_URL`. Se ci si dimentica, il PDF finale non viene più
prodotto. Prima del merge non serve fare nulla.

---

## 3. Cosa ho fatto in questi due giorni

Tutto è sul ramo `feat/um-permanence`, pubblicato su GitHub, **senza pull
request aperta**. Tre commit oltre a `main`:

**`b3fbff1`** duplica il contenuto di #52 (li ho committati prima di sapere che
#52 esisteva). Va scartato: vedi «come ripulire il ramo».

**`bce1362` — allineamento delle variabili d'ambiente.** `.env.example` era
disallineato dal codice: 19 chiavi lette e non documentate, 4 documentate e
lette da nessuno. Ora elenca tutte le 53 variabili, Next.js ed Edge Function.
`scripts/check-env.mjs` prende il codice come fonte di verità e fallisce se i
due divergono; gira in CI. `CLAUDE.md` e `DEPLOYMENT.md` dicono dove va scritta
una chiave nuova, che sono cinque posti, non due.

**`0db8a13` — l'indirizzo di risoluzione diventa visibile.** Nella pagina della
scheda l'identificativo è un collegamento al risolutore con un controllo che
copia la stringa. Negli export di testo e nel PDF escono due righe distinte:
l'identificativo nudo come identità, e l'indirizzo datato alla pubblicazione,
con la nota che l'indirizzo può cambiare mentre l'identificativo no. La
variabile diventa `UM_ID_BASE_URL`, server-only, esposta al browser da
`GET /api/um-id/base-url`. Aggiunge anche `npm run check:dead` (knip) in CI,
che ha trovato 26 altri file scritti e mai collegati, congelati come arretrato
dichiarato in `knip.jsonc`.

**Non ancora committato, nel working tree:** i due punti della sezione 4.

---

## 4. Il codice del cantiere P0: fatto

### Test in CI — fatto

La CI eseguiva solo typecheck, lint e build. Ora esegue l'intera suite Vitest,
`um-id.test.ts` compreso, con gli otto vettori della specifica.

Per arrivarci ho dovuto riparare due file di test che erano rotti da prima e
avrebbero reso la CI rossa il primo giorno: `agent-chat-handler.test.ts` e
`echo/tts/route.test.ts`. Entrambi simulavano `buildServiceClient` con un
oggetto vuoto, mentre il codice chiama `.from('profiles')` per decidere se
esentare lo staff dal limite di frequenza. Ho sistemato solo i finti oggetti nei
file di test, non il codice di produzione. **La suite è ora interamente verde:
205 test passano, nessuno fallisce.**

### Audit `frozen_reason` — analizzato, va chiuso in produzione

Il difetto è confermato nel codice. Il vincolo ammette due soli valori:

```sql
-- supabase/migrations/20260324110811_add_biography_chapter_and_freeze_columns.sql:47
CHECK (frozen_reason IN ('death', 'admin_action'))
```

Due punti scrivono invece `'moderation_report'`:

- `components/admin/ModerationDetailPanel.tsx:229`, nel caso «return» quando la
  segnalazione riguarda una scheda già pubblicata;
- `lib/server/moderation-decide-pipeline.ts:85`, dove
  `serverFreezeBiography(biographyId, reason = 'moderation_report')` ha proprio
  quel valore come predefinito.

L'aggiornamento viene quindi rifiutato dal database con una violazione di
vincolo. Non ho corretto né rimosso niente, perché la domanda giusta viene
prima: **il percorso è mai stato eseguito?** La risposta cambia il rimedio, e
si trova solo in produzione:

```sql
-- Righe incoerenti: se il vincolo ha fatto il suo lavoro devono essere zero
SELECT id, frozen_reason, frozen_at
FROM biographies
WHERE frozen_reason IS NOT NULL
  AND frozen_reason NOT IN ('death', 'admin_action');

-- Il percorso è stato tentato? Decisioni di moderazione su schede pubblicate
SELECT id, decision, reviewed_at
FROM moderation_reports
WHERE decision = 'returned'
ORDER BY reviewed_at DESC
LIMIT 20;
```

Se la prima query non restituisce nulla e la seconda sì, il congelamento è
fallito in silenzio e il problema è la gestione dell'errore, non i dati. Se la
prima restituisce righe, vanno sistemate prima di toccare il codice.

In entrambi i casi la decisione già presa resta: **il congelamento vale solo per
`death` e `admin_action`**, quindi quel percorso di codice va rimosso, non il
vincolo allargato.

---

## 5. Come ripulire il ramo prima di aprire la pull request

Il ramo contiene `b3fbff1`, che duplica #52 già unito. Aprendo una pull request
così com'è, la differenza mostrerebbe file già presenti su `main`. La differenza
reale rispetto a `main` è però già corretta, perché Git confronta gli alberi:
18 file, che sono esattamente il lavoro dei due commit buoni più i due file di
test riparati.

Verifica prima di tutto:

```bash
git diff --stat origin/main..feat/um-permanence
```

Se elenca solo i 18 file attesi, il ramo si può usare così com'è e il commit
duplicato è solo rumore nella cronologia. Se preferisci una cronologia pulita,
il modo più semplice è ripartire da `main`:

```bash
git checkout -b feat/um-resolution-address origin/main
git checkout feat/um-permanence -- .env.example .github/workflows/ci.yml CLAUDE.md DEPLOYMENT.md app/api/um-id components/biography components/export/AdvancedExportDialog.tsx app/biography knip.jsonc lib package.json package-lock.json scripts/check-env.mjs
```

---

## 6. Cosa resta aperto, in ordine

1. **Smoke finale in produzione:** creare una scheda, vedere l'identificativo,
   verificare che il suo indirizzo risponda e non dia 404. È l'unico punto
   dello smoke che manca.
2. **Le due query SQL** della sezione 4 per chiudere l'audit `frozen_reason`.
3. **Aprire la pull request** del ramo. `gh` non funziona su questo Mac (binario
   Intel senza Rosetta), quindi va aperta dal browser:
   https://github.com/BiographyLibrary/Biography-Library/compare/main...feat/um-permanence?expand=1
4. **Dopo il merge:** impostare `UM_ID_BASE_URL` su Jelastic e togliere la
   vecchia `NEXT_PUBLIC_UM_ID_BASE_URL`.
5. **Rigenerare gli export già prodotti**, finché sono tutte schede di prova.
   Lo script non esiste ancora e va scritto.
6. **Dockerfile e `.dockerignore` nel repository.** Vivono solo su
   `/opt/bl-app` e nessuno li ha mai visti; finché è così, il sorgente
   depositato non permette di ricostruire ciò che gira, il che conta per la
   AGPL e per la strategia di durata. Servono i dati di accesso SSH, che stanno
   nel pannello Infomaniak.
7. **`public/sw.js`** è generato dal build ma versionato: ogni build locale lo
   sporca. Andrebbe nel `.gitignore`.

---

## 7. Aggiornamento di PROGETTO.md — non l'ho toccato

Le correzioni che hai elencato restano tutte da fare, e vanno fatte dopo lo
smoke, con le decisioni vere in mano: merge #52 del 19 settembre e revisione
editoriale della specifica; «container Docker standalone» che è nella
[#51](https://github.com/BiographyLibrary/Biography-Library/pull/51) e non su
`main`; i 30 giorni delle memorial come colonna `provisional_until` e non come
stato; originale d'archivio uguale a pacchetto Markdown UTF-8 con il PDF come
resa; `SPEC.md` fermo a giugno.

Nella base di conoscenza (`docs/PLATFORM_KB.md` e
`lib/agents/kb/help-kb-sections.locales.ts:57`) i 30 giorni **non si
cancellano**: si aggiunge che la segnalazione resta possibile anche dopo la
scadenza, per sempre. Poi `npm run kb:sync`.

Manuale operativo e testi legali non si toccano: vivono fuori dal repository.
`lib/i18n/terms-translations.ts` non è il testo legale vigente.
