import { createHash } from 'node:crypto';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';
import { nfc } from '@/lib/nfc';
import { BIOGRAPHIES_AUTHOR_TEXT_COLUMNS } from '@/lib/publication-state';
import type { AnyClient } from '@/lib/server/service-client';

/**
 * Stesso testo di `FORMAT_CONVERSION_REASON` in markdown-format-conversion.ts
 * (tenuto qui per non creare un ciclo di import). Un test verifica l'uguaglianza.
 */
export const FORMAT_CONVERSION_SCREENING_REASON = 'conversione di formato, contenuto invariato';

/** Righe scritte dalla conversione di formato: non sono uno screening vero. */
export function isFormatConversionScreeningReason(reason: string | null | undefined): boolean {
  return reason === FORMAT_CONVERSION_SCREENING_REASON;
}

/** Colonne di `biographies` lette per l'impronta (whitelist testo + modalità). */
export const PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS = [
  ...BIOGRAPHIES_AUTHOR_TEXT_COLUMNS,
  'biography_mode',
] as const;

/**
 * Impronta del testo pubblico di una scheda e registro di screening e pubblicazioni.
 *
 * Garanzia: il testo che va online è quello che lo screening ha esaminato. Lo
 * screening registra l'impronta SHA-256 del testo come lo vedrà il pubblico; chi
 * pubblica la ricalcola e, se è diversa, non pubblica. La pubblicazione forzata
 * salta il confronto ma lascia sempre la traccia (impronta e autore).
 *
 * Cosa entra nell'impronta: tutto ciò che il pubblico può leggere, da qualunque
 * superficie. La pagina pubblica legge `content`; PDF, esporti e archivio leggono
 * `final_version` (altrimenti flusso libero o sezioni); in più titolo e nomi,
 * sezioni, parti del libro attive, didascalie, eventi e relazioni. `content` e
 * `final_version` oggi sono due campi distinti (non byte per byte uguali): entrambi
 * entrano, così una modifica a uno qualunque cambia l'impronta. L'unificazione vera
 * dei due campi è rimandata al blocco Markdown.
 *
 * Cosa NON entra: le colonne che non sono testo (foto come file, visibilità,
 * licenza, dimensione del carattere) e le parti del libro disattivate.
 */

export type PublishMode = 'auto' | 'human_approval' | 'restore' | 'forced';
export type ScreeningVerdict = 'passed' | 'flagged' | 'ai_error' | 'parse_error' | 'text_changed';
export type ScreeningScope = 'full' | 'targeted';

export type GateFailureCode =
  | 'text_changed_during_screening'
  | 'text_changed_since_screening'
  | 'text_changed_since_publication'
  | 'no_screening_record'
  | 'biography_not_found';

export const GATE_FAILURE_MESSAGES: Record<GateFailureCode, string> = {
  text_changed_during_screening:
    'Il testo è cambiato mentre lo screening lo esaminava: non è stato pubblicato e la scheda torna in coda.',
  text_changed_since_screening:
    'Il testo non è quello che lo screening ha esaminato: non è stato pubblicato. Rilancia lo screening sul testo attuale oppure usa la pubblicazione forzata, che lascia traccia.',
  text_changed_since_publication:
    'Il testo non è più quello che era stato pubblicato: non è stato ripristinato. Rilancia lo screening oppure usa la pubblicazione forzata.',
  no_screening_record:
    'Per questa scheda non c\'è nessuno screening registrato: rilancia lo screening oppure usa la pubblicazione forzata, che lascia traccia.',
  biography_not_found: 'Scheda non trovata.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Funzione pura: dal contenuto delle tabelle all'impronta
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicTextInput {
  biography: {
    title?: string | null;
    author_name?: string | null;
    subject_name?: string | null;
    name_as_written?: string | null;
    name_given?: string | null;
    name_family?: string | null;
    name_order?: string | null;
    name_romanized?: string | null;
    romanization_system?: string | null;
    content?: unknown;
    content_freeflow?: string | null;
    final_version?: string | null;
    narrative_order?: unknown;
    biography_mode?: string | null;
    content_html_legacy?: unknown;
  };
  sections: Array<{ section_key?: string | null; content?: string | null }>;
  bookStructure: Record<string, unknown> | null;
  media: Array<{ layout?: string | null; caption?: string | null; display_order?: number | null }>;
  events: Array<Record<string, unknown>>;
  relations: Array<Record<string, unknown>>;
}

/** Testo lungo come lo vede l'archivio: Markdown d'archivio, NFC, senza spazi ai bordi. */
export function normalizePublicBodyText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  if (!text.trim()) return null;
  return nfc(storedToArchiveMarkdown(text)).trim() || null;
}

/** Nomi e brevi campi: NFC e spazi ai bordi. */
export function normalizePublicShortText(value: unknown): string | null {
  if (value == null) return null;
  const text = nfc(String(value)).trim();
  return text || null;
}

const body = normalizePublicBodyText;
const short = normalizePublicShortText;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stable((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Parti del libro (nome blocco screening, colonna contenuto, flag abilitazione). */
export const BOOK_PARTS_FOR_SCREENING = [
  ['dedication', 'dedication_content', 'dedication_enabled'],
  ['epigraph', 'epigraph_content', 'epigraph_enabled'],
  ['preface', 'preface_content', 'preface_enabled'],
  ['epilogue', 'epilogue_content', 'epilogue_enabled'],
  ['acknowledgements', 'acknowledgements_content', 'acknowledgements_enabled'],
  ['specific_credits', 'specific_credits_content', 'specific_credits_enabled'],
] as const;

const BOOK_PARTS = BOOK_PARTS_FOR_SCREENING;

const EVENT_FIELDS = [
  'event_type',
  'event_label',
  'sequence',
  'date_edtf',
  'date_as_given',
  'calendar_code',
  'place_name_as_given',
  'place_name_current',
  'source_note',
] as const;

const RELATION_FIELDS = [
  'relation_code',
  'relation_label',
  'direction',
  'related_um_id',
  'related_name_as_written',
  'related_name_romanized',
  'valid_from_edtf',
  'valid_to_edtf',
  'source_note',
] as const;

function pick(row: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f];
    out[f] = typeof v === 'string' ? short(v) : v ?? null;
  }
  return out;
}

function sortedJson(list: unknown[]): unknown[] {
  return list
    .map((item) => ({ key: JSON.stringify(stable(item)), item }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((x) => x.item);
}

/** Serializzazione canonica: stessa scheda, stessi byte, in qualunque ordine arrivino le righe. */
export function canonicalPublicText(input: PublicTextInput): string {
  const bio = input.biography;

  const contentObj =
    bio.content && typeof bio.content === 'object' && !Array.isArray(bio.content)
      ? (bio.content as Record<string, { text?: unknown } | undefined>)
      : {};
  const content: Record<string, string> = {};
  for (const key of Object.keys(contentObj).sort()) {
    const text = body(contentObj[key]?.text);
    if (text) content[key] = text;
  }

  const sections: Record<string, string> = {};
  for (const s of input.sections) {
    const text = body(s.content);
    if (s.section_key && text) sections[s.section_key] = text;
  }

  const book: Record<string, unknown> = {};
  if (input.bookStructure) {
    for (const [name, contentCol, enabledCol] of BOOK_PARTS) {
      const enabled = input.bookStructure[enabledCol] === true;
      book[name] = enabled ? body(input.bookStructure[contentCol]) : null;
    }
    book.epigraph_source = input.bookStructure.epigraph_enabled === true
      ? short(input.bookStructure.epigraph_source)
      : null;
  }

  const media = sortedJson(
    input.media.map((m) => ({
      layout: short(m.layout),
      caption: body(m.caption),
      display_order: m.display_order ?? 0,
    }))
  );

  const canonical = {
    v: 1,
    names: {
      title: short(bio.title),
      author_name: short(bio.author_name),
      subject_name: short(bio.subject_name),
      name_as_written: short(bio.name_as_written),
      name_given: short(bio.name_given),
      name_family: short(bio.name_family),
      name_order: short(bio.name_order),
      name_romanized: short(bio.name_romanized),
      romanization_system: short(bio.romanization_system),
    },
    mode: short(bio.biography_mode),
    content,
    content_freeflow: body(bio.content_freeflow),
    final_version: body(bio.final_version),
    narrative_order: stable(bio.narrative_order ?? []),
    content_html_legacy: bio.content_html_legacy == null ? null : stable(bio.content_html_legacy),
    sections,
    book,
    media,
    events: sortedJson(input.events.map((e) => pick(e, EVENT_FIELDS))),
    relations: sortedJson(input.relations.map((r) => pick(r, RELATION_FIELDS))),
  };

  return JSON.stringify(canonical);
}

export function fingerprintOfPublicText(input: PublicTextInput): string {
  return createHash('sha256').update(canonicalPublicText(input), 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lettura dal database
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

async function rows(client: AnyClient, table: string, biographyId: string, columns: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select(columns).eq('biography_id', biographyId);
  if (error) throw new Error(`publication_fingerprint_read_failed:${table}:${error.message}`);
  return (data as unknown as Row[] | null) ?? [];
}

export async function collectPublicTextInput(
  client: AnyClient,
  biographyId: string
): Promise<PublicTextInput | null> {
  const { data: bio, error } = await client
    .from('biographies')
    .select(PUBLICATION_FINGERPRINT_BIOGRAPHY_COLUMNS.join(', '))
    .eq('id', biographyId)
    .maybeSingle();
  if (error) throw new Error(`publication_fingerprint_read_failed:biographies:${error.message}`);
  if (!bio) return null;

  const [sections, bookRows, media, events, relations] = await Promise.all([
    rows(client, 'biography_sections', biographyId, 'section_key, content'),
    rows(
      client,
      'biography_book_structure',
      biographyId,
      'dedication_content, epigraph_content, epigraph_source, preface_content, epilogue_content, acknowledgements_content, specific_credits_content, dedication_enabled, epigraph_enabled, preface_enabled, epilogue_enabled, acknowledgements_enabled, specific_credits_enabled'
    ),
    rows(client, 'biography_media', biographyId, 'layout, caption, display_order'),
    rows(
      client,
      'person_events',
      biographyId,
      'event_type, event_label, sequence, date_edtf, date_as_given, calendar_code, place_name_as_given, place_name_current, source_note'
    ),
    rows(
      client,
      'person_relations',
      biographyId,
      'relation_code, relation_label, direction, related_um_id, related_name_as_written, related_name_romanized, valid_from_edtf, valid_to_edtf, source_note'
    ),
  ]);

  return {
    biography: bio as PublicTextInput['biography'],
    sections: sections as PublicTextInput['sections'],
    bookStructure: (bookRows[0] as Record<string, unknown> | undefined) ?? null,
    media: media as PublicTextInput['media'],
    events,
    relations,
  };
}

/** Impronta attuale del testo pubblico, o null se la scheda non esiste. */
export async function computePublicFingerprint(client: AnyClient, biographyId: string): Promise<string | null> {
  const input = await collectPublicTextInput(client, biographyId);
  return input ? fingerprintOfPublicText(input) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registro
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreeningRecordInput {
  biographyId: string;
  fingerprint: string;
  verdict: ScreeningVerdict;
  scope: ScreeningScope;
  examinedChars: number;
  sourceChars: number;
}

/** Registra che lo screening ha esaminato questo testo. Se non riesce, solleva: senza traccia non si pubblica. */
export async function recordScreening(client: AnyClient, input: ScreeningRecordInput): Promise<{ id: string }> {
  const { data, error } = await client
    .from('publication_records')
    .insert({
      biography_id: input.biographyId,
      kind: 'screening',
      fingerprint: input.fingerprint,
      verdict: input.verdict,
      scope: input.scope,
      examined_chars: input.examinedChars,
      source_chars: input.sourceChars,
    })
    .select('id')
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (error || !id) {
    throw new Error(`screening_record_failed:${error?.message ?? 'no row'}`);
  }
  return { id };
}

export interface LatestScreening {
  id: string;
  fingerprint: string;
  verdict: ScreeningVerdict;
  created_at: string;
}

export async function latestScreening(client: AnyClient, biographyId: string): Promise<LatestScreening | null> {
  // Si leggono più righe perché le conversioni di formato (reason valorizzato,
  // examined_chars spesso 0) non sono screening veri: si saltano, restano solo
  // come traccia della continuità dell'impronta.
  const { data, error } = await client
    .from('publication_records')
    .select('id, fingerprint, verdict, created_at, reason')
    .eq('biography_id', biographyId)
    .eq('kind', 'screening')
    .neq('verdict', 'text_changed')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`publication_fingerprint_read_failed:publication_records:${error.message}`);
  const rows = (data as Array<LatestScreening & { reason?: string | null }> | null) ?? [];
  const row = rows.find((r) => !isFormatConversionScreeningReason(r.reason));
  if (!row) return null;
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    verdict: row.verdict,
    created_at: row.created_at,
  };
}

async function latestPublished(
  client: AnyClient,
  biographyId: string
): Promise<{ id: string; fingerprint: string } | null> {
  const { data, error } = await client
    .from('publication_records')
    .select('id, fingerprint')
    .eq('biography_id', biographyId)
    .eq('kind', 'publication')
    .eq('outcome', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`publication_fingerprint_read_failed:publication_records:${error.message}`);
  return (data as { id: string; fingerprint: string } | null) ?? null;
}

export type GateResult =
  | { ok: true; fingerprint: string; screeningRecordId: string | null; screeningFingerprint: string | null }
  | { ok: false; code: GateFailureCode; message: string };

function gateFail(code: GateFailureCode): GateResult {
  return { ok: false, code, message: GATE_FAILURE_MESSAGES[code] };
}

/**
 * Confronto prima di pubblicare.
 *   auto            l'impronta calcolata prima del modello (`expectedFingerprint`) deve
 *                   essere uguale a quella del testo che sta per andare pubblico;
 *   human_approval  deve esistere uno screening registrato di esattamente questo testo;
 *   restore         se la scheda era stata pubblicata, il testo deve essere quello
 *                   dell'ultima pubblicazione (senza traccia precedente si parte da qui);
 *   forced          nessun confronto: si registra impronta e autore.
 */
export async function checkPublishGate(
  client: AnyClient,
  params: { biographyId: string; mode: PublishMode; expectedFingerprint?: string }
): Promise<GateResult> {
  const current = await computePublicFingerprint(client, params.biographyId);
  if (!current) return gateFail('biography_not_found');

  const screening = await latestScreening(client, params.biographyId);
  const screeningRecordId = screening?.id ?? null;
  const screeningFingerprint = screening?.fingerprint ?? null;

  switch (params.mode) {
    case 'forced':
      return { ok: true, fingerprint: current, screeningRecordId, screeningFingerprint };
    case 'auto':
      if (!params.expectedFingerprint || params.expectedFingerprint !== current) {
        return gateFail('text_changed_during_screening');
      }
      return { ok: true, fingerprint: current, screeningRecordId, screeningFingerprint };
    case 'human_approval':
      if (!screening) return gateFail('no_screening_record');
      if (screening.fingerprint !== current) return gateFail('text_changed_since_screening');
      return { ok: true, fingerprint: current, screeningRecordId, screeningFingerprint };
    case 'restore': {
      const previous = await latestPublished(client, params.biographyId);
      if (previous && previous.fingerprint !== current) return gateFail('text_changed_since_publication');
      return { ok: true, fingerprint: current, screeningRecordId, screeningFingerprint };
    }
  }
}

export type GatedPublishResult =
  | { ok: true; fingerprint: string }
  | { ok: false; blocked: true; code: GateFailureCode; message: string }
  | { ok: false; blocked: false; error: string };

/**
 * Unico modo di portare una scheda a `published` dal server:
 * confronto, riga di registro (prima di scrivere lo stato), scrittura dello stato
 * a cura del chiamante, esito nel registro. Se la riga di registro non si scrive,
 * non si pubblica: la pubblicazione forzata in particolare non esiste senza traccia.
 */
export async function gatedPublish(
  client: AnyClient,
  params: { biographyId: string; mode: PublishMode; actorId?: string | null; expectedFingerprint?: string },
  doPublish: () => Promise<string | null>
): Promise<GatedPublishResult> {
  const gate = await checkPublishGate(client, params);
  if (!gate.ok) return { ok: false, blocked: true, code: gate.code, message: gate.message };

  const { data, error } = await client
    .from('publication_records')
    .insert({
      biography_id: params.biographyId,
      kind: 'publication',
      fingerprint: gate.fingerprint,
      mode: params.mode,
      actor_id: params.actorId ?? null,
      screening_record_id: gate.screeningRecordId,
      screening_fingerprint: gate.screeningFingerprint,
      outcome: 'pending',
    })
    .select('id')
    .maybeSingle();
  const recordId = (data as { id?: string } | null)?.id;
  if (error || !recordId) {
    return { ok: false, blocked: false, error: `publication_record_failed:${error?.message ?? 'no row'}` };
  }

  const publishError = await doPublish();
  const { error: finishError } = await client
    .from('publication_records')
    .update({ outcome: publishError ? 'failed' : 'published' })
    .eq('id', recordId);
  if (finishError) {
    console.error('[publication-fingerprint] outcome not recorded', { recordId, message: finishError.message });
  }

  if (publishError) return { ok: false, blocked: false, error: publishError };
  return { ok: true, fingerprint: gate.fingerprint };
}
