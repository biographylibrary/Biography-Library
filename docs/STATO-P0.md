# Stato della priorità zero — chiusa il 21 settembre 2026

> **Aggiornamento del 21 settembre 2026 (sera, poi pomeriggio).** Lo smoke
> sul risolutore è verde. Le query `frozen_reason` in produzione sono vuote.
> La lista d’attesa beta è su `main` ([#60](https://github.com/BiographyLibrary/Biography-Library/pull/60),
> `f5f0ddf`). Restano Markdown d’archivio, segnalazioni a tre corsie e
> documentazione di prodotto fuori da questo file.
>
> | Prova | Esito |
> | ----- | ----- |
> | `UM_ID_BASE_URL` leggibile dall'app | `/api/um-id/base-url` restituisce l'indirizzo |
> | Identificativo emesso, forma canonica | `UM-0000-1D57-F89R-7C6N` risolve alla scheda |
> | Forma senza trattini | risolve |
> | Forma minuscola | risolve |
> | Identificativo mai emesso | 404 |
> | Carattere di controllo errato | 404 |
> | Identificativo emesso che dà 404 | mai accaduto |
> | Identificativo visibile nella scheda | sì, ed è un collegamento al risolutore |
> | Query `frozen_reason` fuori da `death`/`admin_action` | 0 righe |
> | Query `moderation_reports.decision = 'returned'` | 0 righe |
>
> Per arrivarci sono serviti due guasti in produzione introdotti dai merge di
> quel giorno, entrambi risolti: il deploy che leggeva `.env` con `source` e
> moriva sul primo valore con uno spazio (#54), e il contenitore che chiedeva
> la porta 80 a un utente non privilegiato e quindi non partiva (#55).

Documento di passaggio di consegne. Dice dove siamo davvero, cosa è stato
verificato e cosa resta da fare, distinguendo codice e produzione.

---

## In una riga

**La priorità zero non è bloccata: il risolutore in produzione funziona.** Il
500 che l'aveva fatta dichiarare bloccante non è più riproducibile. Non c’è
una pull request UM da aprire: quel lavoro è su `main`.

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

**Verificato il 21 settembre, sera.** Un identificativo realmente emesso,
`UM-0000-1D57-F89R-7C6N`, risolve alla sua scheda in tutte e tre le forme
previste dalla specifica. L'ho trovato senza accedere al database: la scheda
pubblicata ora mostra il proprio identificativo come collegamento, che è
esattamente ciò che quel lavoro serviva a ottenere.

---

## 2. Checklist operativa, riga per riga

`main` su GitHub è `f5f0ddf` (21 settembre, #60). Dockerfile e `.dockerignore`
sono nel repository da [#51](https://github.com/BiographyLibrary/Biography-Library/pull/51).
`UM_ID_BASE_URL` è in produzione.

| Punto | Stato | Nota |
| ----- | ----- | ---- |
| Deploy Jelastic del merge #52 | **fatto** | `c685abf` è su `main` dal 19 settembre |
| Migrazioni `20260904*` | **quasi certamente applicate** | 404 pulito, non errore sulla tabella; conferma eventuale con la query in fondo |
| `scripts/backfill-um-ids.mjs` | **da verificare** | query in fondo, se serve |
| Sottodominio `id` → app Next | **fatto** | verificato dalle risposte HTTP |
| `UM_ID_BASE_URL` | **fatto** | `GET /api/um-id/base-url` in produzione |
| Dockerfile / `.dockerignore` nel repo | **fatto** | #51 su `main`; non si copiano più da `/opt/bl-app` |
| Export di prova rigenerati | **fatto** | #57, poi di nuovo dopo il pattern luogo #58 |
| `public/sw.js` in `.gitignore` | **fatto** | #57 |
| Lista d’attesa beta | **fatto** | #60; home `/` = landing; login su `/login` |
| Query `frozen_reason` | **fatte, 0 righe** | il percorso `moderation_report` si toglie nel cantiere segnalazioni, senza allargare il CHECK |

La variabile si chiama **`UM_ID_BASE_URL`**, senza prefisso, server-only. Il
nome `NEXT_PUBLIC_UM_ID_BASE_URL` è morto. Se fosse ancora nel `.env` del
server si può togliere: il codice non lo legge.

---

## 3. Cosa è su `main` (non c’è un ramo UM da aprire)

Il ramo `feat/um-permanence` è stato unito come
[#53](https://github.com/BiographyLibrary/Biography-Library/pull/53). Non
c’è una pull request da aprire, né un Dockerfile solo sul server.

Uniti, in ordine:

- [#52](https://github.com/BiographyLibrary/Biography-Library/pull/52) — identificativo UM
- [#53](https://github.com/BiographyLibrary/Biography-Library/pull/53) — env, Vitest in CI, indirizzo di risoluzione, `UM_ID_BASE_URL`
- [#51](https://github.com/BiographyLibrary/Biography-Library/pull/51) — Dockerfile standalone e `.dockerignore`
- [#50](https://github.com/BiographyLibrary/Biography-Library/pull/50) — Echo draft card
- [#54](https://github.com/BiographyLibrary/Biography-Library/pull/54) — lettura `.env` senza `source` (riallinea i deploy falliti di #50/#51)
- [#55](https://github.com/BiographyLibrary/Biography-Library/pull/55) — mapping `-p 80:3000`
- [#56](https://github.com/BiographyLibrary/Biography-Library/pull/56) — questo smoke, prima stesura
- [#57](https://github.com/BiographyLibrary/Biography-Library/pull/57) — export depositati con intestazione invariante
- [#58](https://github.com/BiographyLibrary/Biography-Library/pull/58) — riga luogo a sei campi, Nominatim `extratags`, COMMENT WGS 84
- [#60](https://github.com/BiographyLibrary/Biography-Library/pull/60) — lista d’attesa beta

CI: typecheck, lint, build, `check:env`, `check:dead`, tutta la suite Vitest.

---

## 4. Audit `frozen_reason` — chiuso sui dati

Il vincolo ammette solo `death` e `admin_action`. Due punti di codice
scrivono ancora `'moderation_report'`
([ModerationDetailPanel.tsx](../components/admin/ModerationDetailPanel.tsx),
[moderation-decide-pipeline.ts](../lib/server/moderation-decide-pipeline.ts)).
L’UPDATE viene rifiutato.

Query eseguite in produzione il 21 settembre: **Success. No rows returned** su
entrambe. Non ci sono dati da riparare. Il percorso non ha mai persistito.
**Non si allarga il CHECK.** La rimozione del codice sta nel cantiere
segnalazioni.

```sql
SELECT id, frozen_reason, frozen_at
FROM biographies
WHERE frozen_reason IS NOT NULL
  AND frozen_reason NOT IN ('death', 'admin_action');

SELECT id, decision, reviewed_at
FROM moderation_reports
WHERE decision = 'returned'
ORDER BY reviewed_at DESC
LIMIT 20;
```

---

## 5. Come ripulire il ramo — non più applicabile

La sezione che spiegava come togliere il commit duplicato di #52 dal ramo
`feat/um-permanence` è superata: quel ramo è su `main` da #53.

---

## 6. Cosa resta aperto, in ordine

1. Smoke «creazione scheda nuova → UM visibile» alla prossima biografia creata
   (non è stata creata una scheda nuova il 21 settembre).
2. Markdown d’archivio (modulo, conversione in prova, pacchetto, `erasePriorContent`).
3. Segnalazioni a tre corsie, colonna `provisional_until` (non uno stato
   `provisional`), rimozione del percorso `frozen_reason: 'moderation_report'`.
4. I 30 giorni memorial restano; la segnalazione resta possibile dopo la
   scadenza, per sempre. Testi in [PROGETTO.md](../PROGETTO.md), [SPEC.md](../SPEC.md)
   e KB.

Manuale operativo e testi legali non si toccano: vivono fuori dal repository.
`lib/i18n/terms-translations.ts` non è il testo legale vigente.

---

## 7. PROGETTO.md e SPEC.md

Allineati in questo stesso passaggio di documentazione: GitHub (`main` =
`f5f0ddf`), `UM_ID_BASE_URL`, Dockerfile su `main`, lista d’attesa, stati di
pubblicazione (`pdf_draft`, `locked_pending_screening`), WGS 84 sulla riga
luogo, nomi morti `INFOMANIAK_AI_MODEL` / `NEXT_PUBLIC_UM_ID_BASE_URL`, secret
`JELASTIC_*` come posto separato (non in `.env.example`).
