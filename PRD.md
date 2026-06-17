# PRD — Biography Library

**Product Requirements Document** (sintesi). Per dettagli tecnici UI vedi [`docs/DESIGN.md`](docs/DESIGN.md).

---

## Cosa fa il prodotto

Piattaforma open-source multilingue per scrivere, preservare e condividere biografie personali. Gli autori compongono il testo sezione per sezione con assistenza AI opzionale; le biografie passano da screening AI e moderazione umana prima della pubblicazione.

Sviluppato da **Biography Library Association** (Lugano, CH). Licenza **AGPL v3**.

**Missione:** permettere a chiunque di lasciare una traccia scritta della propria vita, con dati ospitati in Svizzera (Infomaniak Jelastic) e AI sovrana (Infomaniak Apertus/Mistral). I diritti sul contenuto restano all'autore.

---

## Chi lo usa

| Persona | Obiettivo |
|---------|-----------|
| **Autore** | Scrivere la propria storia, aggiungere foto, esportare PDF, richiedere pubblicazione |
| **Visitatore** | Leggere biografie pubbliche o con link condiviso |
| **Moderatore / Admin** | Revisionare invii, gestire utenti, monitorare uso AI |

---

## Feature core (in scope)

- Editor strutturato o narrativo libero (Tiptap)
- Assistente AI (grammatica, espansione, prompt guidati) via Infomaniak
- Registrazione vocale e trascrizione
- Workflow pubblicazione: screening AI → moderazione → publish, con cicli di revisione
- Export PDF professionale (copertina, dedica, epilogo, watermark su draft)
- Struttura libro (front/back matter, pagina copyright autore)
- UI multilingue (EN, IT, FR, DE); ogni biografia nella propria lingua
- Privacy: privato / solo link / pubblico
- Pannello admin e PWA installabile

---

## Fuori scope (esplicito)

- Marketplace, vendita libri, pagamenti
- Social network / feed / commenti pubblici
- App mobile nativa (solo PWA)
- Hosting self-service multi-tenant per terzi
- Traduzione automatica dell'intera biografia tra lingue

---

## Stack (riferimento)

Next.js 13 · Supabase · Infomaniak AI · Tailwind/shadcn · jsPDF · deploy Infomaniak Jelastic.

Setup: [`README.md`](README.md) · Deploy: [`DEPLOYMENT.md`](DEPLOYMENT.md) · Cursor: [`.cursor/`](.cursor/)

---

## Successo del prodotto

- Un autore può completare una biografia, esportarla in PDF e inviarla in revisione senza supporto tecnico
- I moderatori gestiscono la coda senza accesso diretto al database
- Nessun segreto nel codice; RLS protegge i dati utente
