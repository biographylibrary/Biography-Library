# Biography Library — Product Context

## Tipi di biografia
1. **Autobiografia** — l'utente scrive di sé stesso
2. **Biografia di persona deceduta** — solo familiari diretti (genitore, figlio, fratello, nipote)

## Modalità di scrittura
- **Sections mode**: 9 capitoli predefiniti (Childhood, Family, Education, Career, Life Events, Relationships, Challenges, Passions, Legacy). Editor TipTap per capitolo. Submit disabilitato finché non tutti i capitoli sono "complete".
- **Freeflow mode**: un unico documento continuo. Textarea. Import testo/DOCX/RTF supportato.
- Il cambio di modalità distrugge il contenuto dell'altra modalità — c'è un dialog di warning con export preventivo (3 step).

## Workflow di pubblicazione
1. Utente scrive → autosave ogni 10 secondi
2. Utente marca sezioni complete (sections mode)
3. Utente clicca "Submit for Review"
4. **AI Screening automatico** (Edge Function → Infomaniak Apertus):
   - Zero flag → pubblicazione automatica immediata
   - Flag trovati → assegnazione automatica a reviewer (per lingua + carico minimo)
5. Reviewer vede solo i passaggi flaggati (non la biografia intera)
6. Reviewer approva/rigetta ogni passaggio
7. Autore riceve notifica con lista passaggi rigettati
8. Autore può modificare SOLO i passaggi rigettati (rest locked)
9. Re-submit → AI rescreening solo sulle sezioni modificate → stesso reviewer

## AI Tools disponibili in editor
- **Testi**: Infomaniak Apertus API (Mistral) — grammar fix, rewrite, summary, prompts guidati ✅
- **Audio / Voice transcription**: Infomaniak Whisper API ✅ — dettatura vocale → testo (Web Speech API rimossa completamente)
- Rate limit: 40 azioni/giorno, 200 azioni/settimana per utente

## Ruoli utente
- `user` — scrive la sua biografia
- `reviewer` — vede solo passaggi flaggati, prende decisioni
- `admin` — pannello admin completo, può promuovere utenti
- `superadmin` — gestione ruoli admin

## Visibilità biografia
- `private` — solo autore
- `link-only` — chi ha il share token
- `public` — visibile nella gallery pubblica (solo dopo pubblicazione)

## Limiti AI per utente
- 40 azioni/giorno (reset mezzanotte UTC)
- 200 azioni/settimana (reset lunedì 00:00 UTC)
- Azioni pesanti (full rewrite, structure proposal) = 2 punti
- Contatore visibile in editor: `0/40` `0/200`

## Struttura libro (Book Structure panel)
Elementi facoltativi attivabili: Dedication, Epigraph, Preface, Epilogue, Acknowledgements, Credits
Tutti inclusi nel PDF se attivati.

## PDF B5
- Dimensioni: 176x250mm (trim), 182x256mm (print-ready con 3mm bleed)
- Font: Noto Serif (caricato da Google Fonts CDN al momento dell'export)
- Cover: zona teal sinistra (titolo/autore) + foto destra. Fallback: cover teal full
- Struttura: Cover → Blank → Title page → Blank → Capitoli → Photo appendix → Back cover teal
- Running headers, page numbers, drop cap su apertura capitolo
- Preflight check: avvisa se manca cover image o author_name

## Features PARTIAL/MISSING da completare (priorità)
1. **Editor lock durante `under_review`** — editor non si blocca dopo submit (CRITICO)
2. **Reviewer "Read" link** — va a URL che ritorna 404 per biografie under_review
3. **Cover image nella view page** — non viene mostrata (solo nel PDF)
4. **AI error → mostra "flagged"** — errori AI appaiono come contenuto segnalato (fuorviante)
5. **Submit button invisibile in sections mode** — appare solo quando TUTTI i capitoli sono completi, nessun hint
6. **isfeatured toggle** — wiring al DB non confermato nel BiographyDetailPanel
7. **Revision history service** — implementato ma non collegato a nessun call site
8. **Smart follow-up questions** — servizio implementato, nessun call site in UI
9. **Language filter gallery** — non pre-seleziona la lingua UI dell'utente
10. **Noto Serif CDN** — fallback silenzioso a Times New Roman se CDN non raggiungibile
