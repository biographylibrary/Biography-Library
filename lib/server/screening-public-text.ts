import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { resolveRecordLanguageTag } from '@/lib/record-language';
import {
  BOOK_PARTS_FOR_SCREENING,
  collectPublicTextInput,
  normalizePublicBodyText,
  normalizePublicShortText,
  type PublicTextInput,
} from '@/lib/server/publication-fingerprint';
import type { AnyClient } from '@/lib/server/service-client';

/**
 * Testo pubblico da esaminare (screening / controllo finale).
 *
 * Un solo costruttore: i percorsi di pubblicazione e il preprint scelgono i
 * blocchi con `ScreeningTextScope`. Normalizzazione uguale all'impronta
 * (`normalizePublicBodyText` / `normalizePublicShortText`).
 */

export type ScreeningTextScope = 'publication' | 'preprint';

/** Chiavi [SECTION: …] dei blocchi oltre al corpo a sezioni. */
export const SCREENING_EXTRA_SECTION_KEYS = [
  'title_and_names',
  'final_version',
  'dedication',
  'epigraph',
  'preface',
  'epilogue',
  'acknowledgements',
  'specific_credits',
  'photo_captions',
  'life_events',
  'relations',
  'freeflow',
] as const;

export type ScreeningExtraSectionKey = (typeof SCREENING_EXTRA_SECTION_KEYS)[number];

/** Campi dell'impronta che non sono prosa da leggere nello screening. */
export const FINGERPRINT_NON_READABLE_FIELDS: Record<string, string> = {
  'biographies.biography_mode': 'Valore tecnico (sections/freeflow), non testo narrativo.',
  'biographies.narrative_order': 'Ordine delle sezioni (JSON), non prosa.',
  'biographies.name_order': 'Codice ordine del nome, non testo leggibile.',
  'biographies.romanization_system': 'Codice del sistema di traslitterazione.',
  'biographies.content_html_legacy':
    'Blob HTML legacy: nessuna superficie lo legge (solo impronta e erase-prior-content).',
  'biography_book_structure.dedication_enabled': 'Flag di attivazione, non testo.',
  'biography_book_structure.epigraph_enabled': 'Flag di attivazione, non testo.',
  'biography_book_structure.preface_enabled': 'Flag di attivazione, non testo.',
  'biography_book_structure.epilogue_enabled': 'Flag di attivazione, non testo.',
  'biography_book_structure.acknowledgements_enabled': 'Flag di attivazione, non testo.',
  'biography_book_structure.specific_credits_enabled': 'Flag di attivazione, non testo.',
  'biography_media.layout': 'Metadato di presentazione della foto.',
  'biography_media.display_order': 'Ordine di visualizzazione, non testo.',
  'person_events.event_type': 'Codice tipo evento.',
  'person_events.sequence': 'Numero di sequenza.',
  'person_events.date_edtf': 'Data strutturata EDTF.',
  'person_events.calendar_code': 'Codice calendario.',
  'person_relations.relation_code': 'Codice relazione.',
  'person_relations.direction': 'Direzione della relazione (enum).',
  'person_relations.related_um_id': 'Identificativo UM tecnico.',
  'person_relations.valid_from_edtf': 'Data strutturata EDTF.',
  'person_relations.valid_to_edtf': 'Data strutturata EDTF.',
};

/**
 * Colonne di testo/jsonb delle cinque tabelle che NON entrano nell'impronta,
 * con il motivo per cui non sono testo pubblico. Il test di allineamento le
 * confronta con information_schema (+ colonne di produzione note).
 */
export const NON_PUBLIC_TEXT_COLUMNS: Record<string, string> = {
  // biographies — non nell'impronta
  'biographies.visibility': 'Scelta di pubblicazione, non testo narrativo.',
  'biographies.status': 'Stato del flusso, non testo.',
  'biographies.share_token': 'Token tecnico.',
  'biographies.translation_of': 'Riferimento all\'originale (uuid), non testo.',
  'biographies.frozen_reason': 'Nota staff interna, non pubblica.',
  'biographies.slug': 'Identificativo URL.',
  'biographies.ai_screening_status': 'Stato tecnico dello screening.',
  'biographies.export_txt_url': 'URL di export.',
  'biographies.export_docx_url': 'URL di export.',
  'biographies.final_pdf_url': 'URL del PDF.',
  'biographies.listing_cover_url': 'URL della copertina catalogo.',
  'biographies.draft_ai_feedback': 'Esito del controllo finale (JSON), non testo autore.',
  'biographies.um_id': 'Identificativo UM.',
  'biographies.record_language_tag': 'Tag lingua del record.',
  'biographies.record_script': 'Codice scrittura.',
  'biographies.record_direction': 'Direzione del testo (ltr/rtl).',
  'biographies.record_language_endonym': 'Endonym della lingua, metadato.',
  'biographies.rights_statement_uri': 'URI licenza.',
  'biographies.rights_holder': 'Metadato diritti.',
  'biographies.consent_basis': 'Metadato consenso.',
  'biographies.biography_type': 'Tipo scheda (autobiografia/memorial), non prosa.',
  'biographies.linked_biography_ids': 'Elenco UUID collegati, non testo narrativo.',
  // biography_media
  'biography_media.file_url': 'Percorso file, non didascalia.',
  'biography_media.file_name': 'Nome file tecnico.',
  // person_events (colonne di produzione oltre al bootstrap PGlite)
  'person_events.calendar_label': 'Etichetta calendario strutturata, non narrativa pubblica.',
  'person_events.place_wikidata_qid': 'Identificativo Wikidata.',
  'person_events.asserted_by': 'Provenienza strutturata (codice).',
  'person_events.asserted_by_label': 'Etichetta provenienza strutturata.',
  'person_events.confidence': 'Livello di confidenza (enum).',
  // person_relations (produzione)
  'person_relations.asserted_by': 'Provenienza strutturata (codice).',
  'person_relations.asserted_by_label': 'Etichetta provenienza strutturata.',
  'person_relations.confidence': 'Livello di confidenza (enum).',
};

/** Campi dell'impronta che lo screening legge come prosa (corpo + blocchi). */
export const FINGERPRINT_READABLE_FIELDS = [
  'biographies.title',
  'biographies.author_name',
  'biographies.subject_name',
  'biographies.name_as_written',
  'biographies.name_given',
  'biographies.name_family',
  'biographies.name_romanized',
  'biographies.content',
  'biographies.content_freeflow',
  'biographies.final_version',
  'biography_book_structure.dedication_content',
  'biography_book_structure.epigraph_content',
  'biography_book_structure.epigraph_source',
  'biography_book_structure.preface_content',
  'biography_book_structure.epilogue_content',
  'biography_book_structure.acknowledgements_content',
  'biography_book_structure.specific_credits_content',
  'biography_media.caption',
  'biography_edition_captions.caption',
  'person_events.event_label',
  'person_events.date_as_given',
  'person_events.place_name_as_given',
  'person_events.place_name_current',
  'person_events.source_note',
  'person_relations.relation_label',
  'person_relations.related_name_as_written',
  'person_relations.related_name_romanized',
  'person_relations.source_note',
] as const;

export type FingerprintReadableField = (typeof FINGERPRINT_READABLE_FIELDS)[number];

/**
 * Campi di `FINGERPRINT_READABLE_FIELDS` che lo scope `preprint` esamina
 * (corpo, parti del libro, didascalie). Titoli/nomi, eventi e relazioni no.
 */
export function readableFieldsForScope(scope: ScreeningTextScope): FingerprintReadableField[] {
  if (scope === 'publication') return [...FINGERPRINT_READABLE_FIELDS];
  return FINGERPRINT_READABLE_FIELDS.filter(
    (f) =>
      f === 'biographies.content' ||
      f === 'biographies.content_freeflow' ||
      f === 'biographies.final_version' ||
      f.startsWith('biography_book_structure.') ||
      f === 'biography_media.caption' ||
      f === 'biography_edition_captions.caption'
  );
}

const NAME_FIELDS = [
  ['title', 'title'],
  ['author_name', 'author_name'],
  ['subject_name', 'subject_name'],
  ['name_as_written', 'name_as_written'],
  ['name_given', 'name_given'],
  ['name_family', 'name_family'],
  ['name_romanized', 'name_romanized'],
] as const;

const EVENT_FREE_TEXT = [
  'event_label',
  'date_as_given',
  'place_name_as_given',
  'place_name_current',
  'source_note',
] as const;

const RELATION_FREE_TEXT = [
  'relation_label',
  'related_name_as_written',
  'related_name_romanized',
  'source_note',
] as const;

function sectionBlock(key: string, content: string): string {
  return `[SECTION: ${key}]\n${content}`;
}

function joinBlocks(blocks: string[]): string {
  return blocks.filter((b) => b.trim().length > 0).join('\n\n');
}

function labeledLines(rows: Array<[string, string]>): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

/**
 * Voci di `content` come sulla pagina pubblica: prima le chiavi note nell'ordine
 * di `BIOGRAPHY_SECTIONS`, poi le altre in ordine alfabetico. Solo testo stringa
 * non vuoto dopo il trim.
 */
export function orderedContentEntries(
  content: unknown
): Array<{ key: string; text: string }> {
  const contentObj =
    content && typeof content === 'object' && !Array.isArray(content)
      ? (content as Record<string, { text?: unknown } | undefined>)
      : {};

  const knownOrder = BIOGRAPHY_SECTIONS.map((s) => s.key);
  const knownSet = new Set<string>(knownOrder);
  const out: Array<{ key: string; text: string }> = [];

  for (const key of knownOrder) {
    const raw = contentObj[key]?.text;
    if (typeof raw !== 'string' || !raw.trim()) continue;
    out.push({ key, text: raw });
  }

  for (const key of Object.keys(contentObj)
    .filter((k) => !knownSet.has(k))
    .sort((a, b) => a.localeCompare(b))) {
    const raw = contentObj[key]?.text;
    if (typeof raw !== 'string' || !raw.trim()) continue;
    out.push({ key, text: raw });
  }

  return out;
}

/** Corpo a sezioni / freeflow con marcatori; tabella se manca o differisce dal JSON. */
export function buildComposedBodyMarked(input: PublicTextInput): string {
  const parts: string[] = [];
  const jsonNorm = new Map<string, string>();

  for (const { key, text } of orderedContentEntries(input.biography.content)) {
    const normalized = normalizePublicBodyText(text);
    if (!normalized) continue;
    jsonNorm.set(key, normalized);
    parts.push(sectionBlock(key, normalized));
  }

  for (const s of input.sections) {
    const key = s.section_key;
    const normalized = normalizePublicBodyText(s.content);
    if (!key || !normalized) continue;
    if (jsonNorm.get(key) === normalized) continue;
    parts.push(sectionBlock(`${key}, tabella`, normalized));
  }

  const freeflow = normalizePublicBodyText(input.biography.content_freeflow);
  if (freeflow) parts.push(sectionBlock('freeflow', freeflow));

  return joinBlocks(parts);
}

/** Stesso corpo senza marcatori, per confrontarlo con final_version normalizzato. */
export function buildComposedBodyPlain(input: PublicTextInput): string {
  const chunks: string[] = [];
  const jsonNorm = new Map<string, string>();

  for (const { key, text } of orderedContentEntries(input.biography.content)) {
    const normalized = normalizePublicBodyText(text);
    if (!normalized) continue;
    jsonNorm.set(key, normalized);
    chunks.push(normalized);
  }

  for (const s of input.sections) {
    const key = s.section_key;
    const normalized = normalizePublicBodyText(s.content);
    if (!key || !normalized) continue;
    if (jsonNorm.get(key) === normalized) continue;
    chunks.push(normalized);
  }

  const freeflow = normalizePublicBodyText(input.biography.content_freeflow);
  if (freeflow) chunks.push(freeflow);

  return chunks.join('\n\n');
}
function buildBodyBlocks(input: PublicTextInput): string[] {
  const composedMarked = buildComposedBodyMarked(input);
  const composedPlain = buildComposedBodyPlain(input);
  const finalNorm = normalizePublicBodyText(input.biography.final_version);

  if (finalNorm && composedPlain && finalNorm === composedPlain) {
    return composedMarked ? [composedMarked] : [finalNorm];
  }

  const out: string[] = [];
  if (composedMarked) out.push(composedMarked);
  else if (composedPlain) out.push(composedPlain);

  if (finalNorm) {
    if (composedPlain && finalNorm !== composedPlain) {
      out.push(sectionBlock('final_version', finalNorm));
    } else if (!composedPlain && !composedMarked) {
      out.push(finalNorm);
    }
  }
  return out;
}

function buildTitleAndNames(input: PublicTextInput): string | null {
  const lines: Array<[string, string]> = [];
  for (const [field, label] of NAME_FIELDS) {
    const v = normalizePublicShortText(input.biography[field]);
    if (v) lines.push([label, v]);
  }
  if (lines.length === 0) return null;
  return sectionBlock('title_and_names', labeledLines(lines));
}

function buildBookParts(input: PublicTextInput): string[] {
  const bs = input.bookStructure;
  if (!bs) return [];
  const out: string[] = [];
  for (const [name, contentCol, enabledCol] of BOOK_PARTS_FOR_SCREENING) {
    if (bs[enabledCol] !== true) continue;
    const content = normalizePublicBodyText(bs[contentCol]);
    if (name === 'epigraph') {
      const source = normalizePublicShortText(bs.epigraph_source);
      if (!content && !source) continue;
      const body = [content, source ? `epigraph_source: ${source}` : null]
        .filter((line): line is string => Boolean(line))
        .join('\n');
      out.push(sectionBlock('epigraph', body));
    } else {
      if (!content) continue;
      out.push(sectionBlock(name, content));
    }
  }
  return out;
}

function buildPhotoCaptions(input: PublicTextInput): string | null {
  const lines: string[] = [];
  const sorted = [...input.media].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || String(a.layout ?? '').localeCompare(String(b.layout ?? ''))
  );
  for (const m of sorted) {
    const caption = normalizePublicBodyText(m.caption);
    if (!caption) continue;
    const layout = normalizePublicShortText(m.layout) ?? 'photo';
    lines.push(`${layout}: ${caption}`);
  }
  for (const row of input.editionCaptions ?? []) {
    const caption = normalizePublicBodyText(row.caption);
    if (caption) lines.push(`caption: ${caption}`);
  }
  if (lines.length === 0) return null;
  return sectionBlock('photo_captions', lines.join('\n'));
}

function buildLifeEvents(input: PublicTextInput): string | null {
  const blocks: string[] = [];
  for (const ev of input.events) {
    const lines: Array<[string, string]> = [];
    for (const f of EVENT_FREE_TEXT) {
      const v = normalizePublicShortText(ev[f]) ?? normalizePublicBodyText(ev[f]);
      if (v) lines.push([f, v]);
    }
    if (lines.length > 0) blocks.push(labeledLines(lines));
  }
  if (blocks.length === 0) return null;
  return sectionBlock('life_events', blocks.join('\n\n'));
}

function buildRelations(input: PublicTextInput): string | null {
  const blocks: string[] = [];
  for (const rel of input.relations) {
    const lines: Array<[string, string]> = [];
    for (const f of RELATION_FREE_TEXT) {
      const v = normalizePublicShortText(rel[f]) ?? normalizePublicBodyText(rel[f]);
      if (v) lines.push([f, v]);
    }
    if (lines.length > 0) blocks.push(labeledLines(lines));
  }
  if (blocks.length === 0) return null;
  return sectionBlock('relations', blocks.join('\n\n'));
}

/**
 * Costruisce il testo da esaminare a partire dall'input pubblico (stesso del fingerprint).
 * `publication`: corpo + titoli/nomi + parti libro + didascalie + eventi + relazioni.
 * `preprint`: corpo + parti libro + didascalie (niente titoli/nomi, eventi, relazioni).
 */
export function assembleScreeningText(
  input: PublicTextInput,
  scope: ScreeningTextScope
): { text: string; sourceChars: number } {
  const blocks: string[] = [...buildBodyBlocks(input)];

  if (scope === 'publication') {
    const names = buildTitleAndNames(input);
    if (names) blocks.push(names);
  }

  blocks.push(...buildBookParts(input));

  const captions = buildPhotoCaptions(input);
  if (captions) blocks.push(captions);

  if (scope === 'publication') {
    const events = buildLifeEvents(input);
    if (events) blocks.push(events);
    const relations = buildRelations(input);
    if (relations) blocks.push(relations);
  }

  const text = joinBlocks(blocks);
  return { text, sourceChars: text.length };
}

export type ScreeningPublicTextResult = {
  text: string;
  sourceChars: number;
  authorId: string;
  contentLanguage: string;
};

/**
 * Punto unico: legge la scheda e costruisce il testo per lo screening o il preprint.
 */
export async function fetchScreeningPublicText(
  client: AnyClient,
  biographyId: string,
  scope: ScreeningTextScope
): Promise<ScreeningPublicTextResult> {
  const input = await collectPublicTextInput(client, biographyId);
  if (!input) {
    return { text: '', sourceChars: 0, authorId: '', contentLanguage: 'en' };
  }

  const { data: meta } = await client
    .from('biographies')
    .select('user_id, record_language_tag')
    .eq('id', biographyId)
    .maybeSingle();

  const authorId = (meta as { user_id?: string } | null)?.user_id ?? '';
  const contentLanguage = resolveRecordLanguageTag(meta as { record_language_tag?: string } | null);
  const { text, sourceChars } = assembleScreeningText(input, scope);
  return { text, sourceChars, authorId, contentLanguage };
}
