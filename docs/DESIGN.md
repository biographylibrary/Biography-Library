# Biography Library — Design system

Documento di riferimento per UI web, editor e export PDF.  
**Fonte di verità nel codice:** `tailwind.config.ts`, `app/globals.css`, `lib/ui-palette.ts`, `lib/pdf-export.ts`.

Ultimo aggiornamento: giugno 2026.

---

## 1. Principi

- **Stile sobrio e leggibile:** toni beige/grigio, testo nero `#121212`, nessun peso bold globale (tutto a `font-weight: 400`).
- **Tipografia:** sans per UI e corpo; serif per titoli (`h1`–`h6`) e contenuto editor/PDF narrativo.
- **Palette chiusa:** per alert, banner, dialog, badge usare solo token `brand-*` — non introdurre scale Tailwind generiche (`amber`, `sky`, `emerald`, `red`, …).
- **shadcn/ui + Radix:** componenti in `components/ui/`; non aggiungere altre librerie UI (vedi README).
- **Dark mode:** supportato via `class` su `<html>` (`next-themes`).
- **i18n:** nessuna stringa visibile hardcoded; 4 lingue UI (EN, IT, FR, DE) in `lib/i18n/translations.ts`.

---

## 2. Stack e configurazione

| Elemento | Valore |
|----------|--------|
| CSS | Tailwind CSS 3.3 + `tailwindcss-animate` |
| Componenti | shadcn/ui (`components.json`: style `default`, `baseColor` neutral, `cssVariables: true`, RSC) |
| Tema | `darkMode: ['class']` in `tailwind.config.ts` |
| Theme color (PWA / meta) | `#121212` (`app/layout.tsx`, `manifest.json`) |
| Background PWA | `#ede9e0` (`manifest.json`) |

---

## 3. Tipografia (web)

### Font

- **Sans (UI + body):** Noto Sans — Google Fonts, peso 400.
- **Serif (titoli):** Noto Serif — Google Fonts, peso 400 (anche italic).

Import in `app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400&family=Noto+Serif:ital,wght@0,400;1,400&display=swap');
```

### Regole globali

- `*, *::before, *::after { font-weight: 400 !important; }` — niente bold di default.
- `body`: `font-sans`, `background-color: var(--bg-main)`, `color: var(--text-primary)`.
- `h1`–`h6`: `font-serif`.

### Famiglie Tailwind

```ts
fontFamily: {
  sans: ['Noto Sans', 'sans-serif'],
  serif: ['Noto Serif', 'serif'],
}
```

### Accessibilità — dimensione UI

Preferenza utente in `profiles.ui_font_size`: `small` | `normal` | `large` | `extra-large`.

Scala su `document.documentElement.style.fontSize`:

| Impostazione | Scala |
|--------------|-------|
| small | 90% |
| normal | 100% |
| large | 115% |
| extra-large | 130% |

Componenti: `components/accessibility/font-size-control.tsx`, `lib/auth-context.tsx`.

### Editor — dimensione testo locale

Nel toolbar editor, dimensioni discrete in px: **14–20, 22, 24** (`components/editor/editor-font-size-control.tsx`), applicate al DOM TipTap.

---

## 4. Colori

### 4.1 Palette brand (ufficiale)

Usare **solo** classi `bg-brand-*`, `text-brand-*`, `border-brand-*` (eventualmente con opacità `/10`, `/25`, …) per callout, alert, banner, dialog, badge.

| Token Tailwind | Hex | Uso tipico |
|----------------|-----|------------|
| `brand-ink` | `#121212` | Testo su superfici chiare |
| `brand-paper` | `#FFFFFF` | Sfondi pieni chiari |
| `brand-beigeLight` | `#FDFBF7` | Testo su sfondi scuri |
| `brand-beigeBg` | `#ECE9E4` | Sfondo neutro / card |
| `brand-greenLight` | `#C8DFBE` | Successo, positivo |
| `brand-greenDark` | `#5E685A` | Testo successo |
| `brand-blue` | `#C4DAEB` | Info, stato neutro / in corso |
| `brand-mustardLight` | `#EDE4B9` | Avvisi, warning |
| `brand-mustardDark` | `#DDCF88` | Bordi/enfasi warning |
| `brand-wine` | `#944454` | Errore, pericolo |
| `brand-wineDark` | `#6D323E` | Testo errore forte |

**Hex in TypeScript:** `lib/ui-palette.ts` → `brandHex`.

**Vietato** per questi elementi: `bg-amber-*`, `bg-sky-*`, `bg-emerald-*`, `bg-red-*`, `text-rose-*`, ecc.

### 4.2 Stringhe callout precomposte

`lib/ui-palette.ts` → `uiCallout`:

| Chiave | Ruolo |
|--------|--------|
| `warning` | mustard + ink |
| `info` | blue + ink |
| `success` | greenLight + greenDark |
| `danger` | wine + wineDark |

Include varianti `dark:` coerenti con `brand-beigeLight` / `brand-greenLight`.

### 4.3 Token semantici (shadcn / HSL)

Definiti in `app/globals.css` come variabili HSL (`--background`, `--foreground`, `--primary`, `--destructive`, `--radius`, …) e mappati in `tailwind.config.ts` (`background`, `foreground`, `card`, `primary`, …).

**Border radius:** `--radius: 0.75rem` (light); `lg` / `md` / `sm` derivati in Tailwind.

### 4.4 Token legacy / layout (Tailwind diretti)

Usati in layout e superfici (oltre a `brand`):

| Classe | Hex (light) | Note |
|--------|-------------|------|
| `bg-main` | `#EDEBE7` | Sfondo app |
| `bg-surface` | `#FDFBF7` | Superfici elevate |
| `text-primary` | `#121212` | |
| `text-secondary` | `#616161` | |
| `btn-primary-bg` | `#EDEBE7` | |
| `btn-primary-border` | `#121212` | |
| `btn-hover` | `#C8DFBE` | |
| `border-global` | `#616161` | |
| `error` | `#944454` | Allineato a `brand-wine` |
| `status-info` | `#C4DAEB` | (= brand-blue in CSS vars) |
| `status-warning` | `#EDE4B9` | |
| `status-success` | `#C8DFBE` | |

**Dark mode** (`:root` vs `.dark` in `globals.css`):

| Variabile | Dark |
|-----------|------|
| `--bg-main` | `#1F2121` |
| `--bg-surface` | `#656767` |
| `--text-primary` | `#FDFBF7` |
| `--text-secondary` | `rgba(167, 169, 169, 0.7)` |
| `--btn-primary-bg` | `#1F2121` |
| `--btn-primary-border` | `#EDEBE7` |

---

## 5. Editor rich text (TipTap / ProseMirror)

Stili in `app/globals.css` (classe `.ProseMirror`):

| Elemento | Stile |
|----------|--------|
| Area | `min-height: 300px`, no outline |
| `h1` | `text-3xl font-serif`, margini verticali |
| `h2` | `text-2xl font-serif` |
| `h3` | `text-xl font-serif` |
| `p` | `mb-3 leading-relaxed` |
| Liste | `list-disc` / `list-decimal`, `pl-6` |
| `blockquote` | bordo sinistro `border-primary`, italic, `text-muted-foreground` |
| `hr` | `border-t-2 border-border` |
| Link | `text-primary underline` |
| `strong` | peso 400 (no bold visivo) |
| Placeholder | `text-muted-foreground/50` su primo paragrafo vuoto |

---

## 6. Layout applicazione

- **Shell:** `flex flex-col h-screen overflow-hidden` (`app/layout.tsx`).
- **Header:** `ConditionalHeader` (fisso in alto).
- **Main:** `flex-1 overflow-auto min-h-0`.
- **Footer:** sempre visibile in fondo.
- **PWA:** prompt install + `manifest.json` (`short_name`: BioLib).

---

## 7. Export PDF (libro B5)

**Implementazione:** `lib/pdf-export.ts` (jsPDF).  
**Formato:** B5 **176 × 250 mm** (trim); stampa con bleed 182×256 mm citata in documentazione prodotto.

### 7.1 Font PDF

- **Noto Serif** (Regular, Bold, Italic, BoldItalic).
- Client: `/fonts/noto-serif` o CDN; server: `public/fonts/noto-serif`.
- Fallback documentato: Times New Roman se font non caricati.

### 7.2 Margini e impaginazione

| Costante | mm |
|----------|-----|
| `MARGIN_TOP` | 15 |
| `MARGIN_BOTTOM` | 20 |
| `MARGIN_INNER` | 20 |
| `MARGIN_OUTER` | 15 |
| `SAFE_MARGIN` | 5 |

- Pagine contenuto: margini **alternati** inner/outer (libro).
- Capitoli in **sections mode**: inizio sezione su pagina **dispari** (salto pagina se pari).
- **Freeflow:** margine superiore corpo extra `FREEFLOW_EXTRA_TOP_MARGIN_MM` (10 mm).

### 7.3 Tipografia PDF

| Uso | pt |
|-----|-----|
| Corpo | 11 (`PT_BODY`, interlinea ×1.6) |
| Titolo capitolo (sections) | 22 (`PT_CHAPTER`) |
| Running header (disabilitato di default) | 9 (`PT_RUNNING`) |
| Numero pagina | 10 (`PT_PAGE_NUM`) |
| Frontespizio — titolo | 28 |
| Frontespizio — autore | 11 |
| Crediti / back matter piccolo | 9 (`PT_CREDITS`) |
| Didascalie galleria | 9 (`PT_CAPTION`) |
| Copertina composita — titolo | 34 |
| Copertina composita — autore | 18 |

**Running header narrativo:** `PDF_DRAW_SECTION_RUNNING_HEADER = false` — nessuna ripetizione del titolo sezione in grigio in cima alle pagine di corpo (solo titolo capitolo grande all’inizio sezione in sections mode, oppure solo corpo in freeflow).

### 7.4 Struttura documento (ordine attuale nel codice)

1. **Copertina** — `cover_a5` full bleed **oppure** composita `drawPhotoCover` (card beige + foto).
2. Opzionale: **pagina copyright autore** (`include_author_copyright_page`).
3. **Frontespizio interno** (autore + titolo centrati).
4. **Front matter** (se attivo): dedica → epigrafe → prefazione (`addSectionWithTitle`, running header opzionale per prefazione).
5. **Corpo** — sezioni narrative o freeflow unico blocco.
6. **Galleria foto** (se presente).
7. **Back matter** (se attivo): epilogo, ringraziamenti, crediti specifici.
8. **Quarta di copertina** — card beige `drawBackCover` (logo, testi legali, footer).

### 7.5 Copertina composita (`drawPhotoCover`)

- Sfondo pagina: bianco.
- **Card titolo:** `#ECE9E4` (`brand-beigeBg`), raggio 6 mm, bordo 10 mm, padding interno 10 mm.
- Testo titolo/autore: `#121212`.
- **Card foto:** sotto la card titolo, gap 8 mm, altezza foto **110 mm**, larghezza = card; immagine in **cover crop** con clip arrotondato.
- Alternativa: immagine A5 custom (`cover_a5`) a tutta pagina.

### 7.6 Quarta di copertina

- Card **156 × 230 mm**, posizione (10, 10), raggio 5, fill `#ECE9E4`.
- Logo Biography Library (SVG path in codice), testi legali con adattamento automatico dimensione (9 pt, interlinea 1.6).
- Testi da traduzioni export (`backCoverDescription`, `backCoverPropertyStatement`, `backCoverAiStatement`, `backCoverFooter`).

### 7.7 Bozze (watermark)

`pdf_draft_iteration` 1–3 → etichetta diagonale su ogni pagina (DRAFT / SECOND DRAFT / THIRD DRAFT — FINAL REVIEW), multilingua.

### 7.8 Galleria nel PDF

Layout `biography_media.layout`:

| Layout | Comportamento |
|--------|----------------|
| `full-page` | Una foto per pagina |
| `two-vertical` | Due foto impilate (coppie consecutive) |
| `two-horizontal` | Due foto affiancate |
| `three-mixed` | Una grande sopra + due sotto |

Didascalie: italic, 9 pt, grigio `(80,80,80)`, centrate sotto l’immagine.

### 7.9 Catalogo / listing

Dopo PDF finale approvato: **JPEG pagina 1** come `listing_cover_url` (pipeline server); griglia e view pubblica preferiscono questo asset (vedi `ARCHITECTURE.md`).

---

## 8. Convenzioni UI da rispettare

1. **Colori di stato** → solo `brand-*` o `uiCallout`.
2. **Nuovi componenti** → shadcn in `components/ui/`, non nuove dipendenze UI.
3. **Stringhe** → `useTranslation()` + 4 lingue.
4. **PDF** → modifiche minime e mirate in `pdf-export.ts`; preflight `checkBiographyPdfReadiness` / `checkPdfPreflight`.
5. **Logo / identità** → SVG logo in PDF; `theme-color` e PWA allineati a `#121212`.

---

## 9. Note su documentazione legacy

Documentazione esterna o chat precedenti possono ancora citare:

- copertina **teal** a sinistra + foto a destra;
- **drop cap** all’apertura capitolo;
- sequenza con pagine bianche / pagina logo esplicite.

**L’implementazione corrente** usa la copertina **beige card + foto** (o A5 full bleed via layout `cover_a5`), frontespizio interno senza drop cap nel codice, e la struttura elencata in §7.4. In caso di conflitto, **prevalere questo documento e `lib/pdf-export.ts`**.

Contesto Cursor aggiornato: `.cursor/rules/`, `PRD.md`, `SPEC.md`.

---

## 10. File sorgente (indice)

| File | Contenuto design |
|------|------------------|
| `.cursor/rules/ui-color-palette.mdc` | Regole palette brand (auto-attached su tsx/css) |
| `.cursor/rules/` | Rules Cursor (foundation, workflow, security) |
| `PRD.md` / `SPEC.md` | Requisiti prodotto e specifica funzionale |
| `lib/ui-palette.ts` | Hex + `uiCallout` |
| `tailwind.config.ts` | `brand`, font, radius, token semantici |
| `app/globals.css` | CSS variables, ProseMirror, body |
| `components.json` | Config shadcn |
| `lib/pdf-export.ts` | Layout PDF B5 |
| `public/manifest.json` | Colori PWA |
| `app/layout.tsx` | theme-color, shell |
| `ARCHITECTURE.md` §7 | Panoramica PDF export |
| `components/accessibility/font-size-control.tsx` | Scala UI accessibilità |

---

*Biography Library — AGPL-3.0*
