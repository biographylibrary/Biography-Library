# Stato della priorità zero — aggiornato 15 ottobre 2026

Documento operativo: cosa è verificato in produzione e cosa resta aperto.
Non elenca pull request già chiuse; per il prodotto completo vedi `PROGETTO.md`.

---

## In una riga

Il risolutore UM in produzione funziona. I blocchi 1–5 (strumenti AI, Markdown, screening a pezzi, lavori asincroni, edizioni, archivio) sono su `main`. Restano smoke su schede nuove, conversione HTML reale e debiti elencati in `PROGETTO.md`.

---

## Verificato (produzione)

| Prova | Esito |
| ----- | ----- |
| `UM_ID_BASE_URL` leggibile dall’app | `GET /api/um-id/base-url` restituisce l’indirizzo |
| Identificativo emesso (forme canoniche / senza trattini / minuscole) | risolve alla scheda |
| Identificativo mai emesso o controllo errato | 404 |
| Identificativo emesso che dà 404 | mai osservato |
| Identificativo visibile in scheda come collegamento | sì |
| Query `frozen_reason` fuori da `death` / `admin_action` | 0 righe (21 settembre 2026) |
| Lista d’attesa beta | home `/` = landing; accesso su `/login` |
| Dockerfile standalone + deploy Actions → Jelastic | su `main` |

Sottodominio `id` → stessa app Next.js; middleware riscrive la forma senza `/id/`.

---

## Checklist operativa (persistente)

| Punto | Stato |
| ----- | ----- |
| Deploy Jelastic da `main` | fatto |
| Migrazioni permanenza / UM | applicate |
| `UM_ID_BASE_URL` (solo server; non `NEXT_PUBLIC_*`) | fatto |
| Export di prova con intestazione invariante | fatto |
| Lista d’attesa | fatto |
| Blocchi prodotto 1–5 uniti | fatto |

---

## Cosa resta aperto

1. Smoke «creazione scheda nuova → UM visibile» alla prossima biografia reale.
2. Conversione HTML → Markdown in produzione: `npm run markdown:legacy` (senza `--apply` resta prova). Dopo `--apply`, annotare la data e pianificare il drop di `biography_source_html_legacy` / `content_html_legacy` a +180 giorni.
3. Debiti in `PROGETTO.md` (archivio N+1/corsa, email Edge, sitemap, PDF non latino, Fase 2, ecc.).
4. Manuali operativi e testi legali: fuori repository. `lib/i18n/terms-translations.ts` non è il testo legale vigente.

---

## Query utili (produzione)

```sql
SELECT id, frozen_reason, frozen_at
FROM biographies
WHERE frozen_reason IS NOT NULL
  AND frozen_reason NOT IN ('death', 'admin_action');

SELECT
  count(*) AS section_rows,
  count(*) FILTER (
    WHERE revision_history IS NOT NULL AND revision_history <> '[]'::jsonb
  ) AS with_history,
  coalesce(sum(pg_column_size(revision_history)), 0) AS revision_history_bytes
FROM biography_sections;
```

---

*Ultimo aggiornamento: 15 ottobre 2026*
