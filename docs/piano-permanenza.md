# Piano permanenza — stato

Aggiornato: 4 settembre 2026 (Anno 0 UM).

## Chiuso

| # | Cantiere | Stato |
|---|---|---|
| Prereq | Selettore licenza + trigger public | fatto |
| Prereq | Backfill licenza BY-NC-SA sulle 8 public demo | fatto (migrazione `20260904160000`) |
| Prereq | Backfill `um_id` sulle 15 schede senza ID | fatto (`scripts/backfill-um-ids.mjs`) |
| 1 | Editor eventi/luoghi/provenienza/relazioni | fatto |
| 2 | Scelta licenza (testi ufficiali, upgrade 1→2) | fatto |
| 3 | Export testo UTF-8 invariante | fatto |
| 4 | PDF intestazione + colophon | fatto (senza nuovi font) |
| 5 | Notazione UM in UI / crediti / email | fatto |
| 6 | `record_language_tag` preferito | fatto (helper + call site principali) |
| 7 | Parser EDTF sottoinsieme | fatto (volutamente limitato) |
| 8 | NFC su write path principali | fatto |
| Policy | Termini + crediti: scelta autore + CC0 metadati | fatto |

## Non da costruire ora (§9)

Mappature verso schema.org / GEDCOM / CIDOC / RiC / EAD / Europeana / OAI-PMH.
Gli atomi (eventi, relazioni, UM id, `updated_at`) ci sono già.

## Debito noto (fuori da questo piano, ma tracciato)

- Motore PDF diverso da jsPDF per scritture non latine (subsetting glifi).
- `content_language` ancora presente (CHECK a 4 lingue); ritiro completo più avanti.
- NFC non ancora su *ogni* API di scrittura secondaria (import, some admin paths).
