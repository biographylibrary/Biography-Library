/**
 * Conversione HTML → Markdown d’archivio (solo comando `npm run markdown:legacy -- --apply`).
 * Non importare da rotte `app/api`: qui si scrive la riga di screening «conversione di formato».
 */

import {
  BOOK_TEXT_FIELDS,
  assessFields,
  collectContentFields,
  convertedContent,
  decideApply,
  type ApplyDecision,
  type StoredField,
} from '@/lib/archive-markdown-legacy';
import { looksLikeStoredHtml, storedToArchiveMarkdown, storedToPlainText } from '@/lib/archive-markdown';
import { nfc } from '@/lib/nfc';
import {
  computePublicFingerprint,
  FORMAT_CONVERSION_SCREENING_REASON,
  type ScreeningVerdict,
  type ScreeningScope,
} from '@/lib/server/publication-fingerprint';
import type { AnyClient } from '@/lib/server/service-client';

export const FORMAT_CONVERSION_REASON = FORMAT_CONVERSION_SCREENING_REASON;

export type SectionRow = {
  id: string;
  biography_id: string;
  section_key: string | null;
  content: string | null;
  revision_history?: Array<{ version?: number; content?: string; timestamp?: string }> | null;
};

export type BookRow = {
  biography_id: string;
} & Record<(typeof BOOK_TEXT_FIELDS)[number], string | null>;

export type BiographyConversionRow = {
  id: string;
  slug: string | null;
  title: string | null;
  um_id: string | null;
  status: string | null;
  content: unknown;
  content_freeflow: string | null;
  final_version: string | null;
};

function plainStored(value: string): string {
  return nfc(storedToPlainText(value)).replace(/\s+/g, ' ').trim();
}

function revisionFieldsFor(sectionRows: SectionRow[]): StoredField[] {
  const fields: StoredField[] = [];
  for (const section of sectionRows) {
    const history = Array.isArray(section.revision_history) ? section.revision_history : [];
    history.forEach((entry, index) => {
      const entryId =
        entry.version != null ? String(entry.version) : `${section.section_key || section.id}:${index}`;
      fields.push({
        path: `revision_history.${section.section_key || section.id}.${entryId}`,
        value: entry.content ?? null,
      });
    });
  }
  return fields;
}

export function collectBiographyFields(
  bio: BiographyConversionRow,
  sectionRows: SectionRow[],
  book: BookRow | undefined
): StoredField[] {
  const bookFields: StoredField[] = book
    ? BOOK_TEXT_FIELDS.map((name) => ({ path: `book.${name}`, value: book[name] }))
    : [];
  return [
    ...collectContentFields(bio.content),
    { path: 'content_freeflow', value: bio.content_freeflow },
    { path: 'final_version', value: bio.final_version },
    ...sectionRows.map((section) => ({
      path: `sections.${section.section_key || section.id}`,
      value: section.content,
    })),
    ...bookFields,
    ...revisionFieldsFor(sectionRows),
  ];
}

export function assessBiographyConversion(
  bio: BiographyConversionRow,
  sectionRows: SectionRow[],
  book: BookRow | undefined
): { decision: ApplyDecision; fields: StoredField[] } {
  const fields = collectBiographyFields(bio, sectionRows, book);
  const assessment = assessFields(fields);
  return { decision: decideApply(bio.status, assessment), fields };
}

function parseRevisionPath(
  path: string
): { sectionRef: string; entryId: string } | null {
  const m = /^revision_history\.(.+)\.([^.]+)$/.exec(path);
  if (!m) return null;
  return { sectionRef: m[1], entryId: m[2] };
}

/** Solo HTML vero: mai salvare Markdown come «HTML precedente». */
export function legacyRowsForFields(
  biographyId: string,
  fields: StoredField[]
): Array<{ biography_id: string; source_column: string; entry_id: string | null; content: string }> {
  const rows: Array<{
    biography_id: string;
    source_column: string;
    entry_id: string | null;
    content: string;
  }> = [];
  for (const field of fields) {
    const value = field.value ?? '';
    if (!value.trim() || !looksLikeStoredHtml(value)) continue;
    const rev = parseRevisionPath(field.path);
    if (rev) {
      rows.push({
        biography_id: biographyId,
        source_column: 'revision_history',
        entry_id: rev.entryId,
        content: value,
      });
      continue;
    }
    rows.push({
      biography_id: biographyId,
      source_column: field.path,
      entry_id: null,
      content: value,
    });
  }
  return rows;
}

export function verifyPlainTextIdentity(fields: StoredField[]): void {
  for (const field of fields) {
    const value = field.value ?? '';
    if (!value.trim() || !looksLikeStoredHtml(value)) continue;
    const markdown = storedToArchiveMarkdown(value);
    if (plainStored(value) !== plainStored(markdown)) {
      throw new Error(`plain_text_mismatch:${field.path}`);
    }
  }
}

/**
 * Copia HTML in biography_source_html_legacy via PostgREST (supabase-js).
 * Non usa ON CONFLICT sull’indice a espressione (PostgREST non lo espone):
 * legge la riga esistente; se manca inserisce; se c’è e il testo coincide
 * lascia stare; se c’è e differisce si ferma (niente sovrascrittura).
 * Su 23505 in corsa rilegge e applica le stesse regole.
 */
async function ensureLegacyHtmlCopy(
  client: AnyClient,
  row: { biography_id: string; source_column: string; entry_id: string | null; content: string }
): Promise<void> {
  const readExisting = async (): Promise<string | null> => {
    let q = client
      .from('biography_source_html_legacy')
      .select('content')
      .eq('biography_id', row.biography_id)
      .eq('source_column', row.source_column);
    q = row.entry_id == null ? q.is('entry_id', null) : q.eq('entry_id', row.entry_id);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(`legacy_read_failed:${error.message}`);
    const content = (data as { content?: string } | null)?.content;
    return content == null ? null : content;
  };

  const existing = await readExisting();
  if (existing != null) {
    if (existing === row.content) return;
    throw new Error(
      `legacy_content_mismatch:${row.biography_id}:${row.source_column}` +
        (row.entry_id != null ? `:${row.entry_id}` : '')
    );
  }

  const { error } = await client.from('biography_source_html_legacy').insert(row);
  if (!error) return;
  const code = (error as { code?: string }).code;
  if (code !== '23505') throw new Error(`legacy_insert_failed:${error.message}`);

  const again = await readExisting();
  if (again == null) throw new Error(`legacy_insert_race_missing:${row.biography_id}`);
  if (again === row.content) return;
  throw new Error(
    `legacy_content_mismatch:${row.biography_id}:${row.source_column}` +
      (row.entry_id != null ? `:${row.entry_id}` : '')
  );
}

function convertedRevisionHistory(
  section: SectionRow
): Array<{ version?: number; content?: string; timestamp?: string }> | null {
  const history = Array.isArray(section.revision_history) ? section.revision_history : null;
  if (!history) return null;
  return history.map((entry) => {
    const content = entry.content ?? '';
    if (!content.trim() || !looksLikeStoredHtml(content)) return entry;
    return { ...entry, content: storedToArchiveMarkdown(content) };
  });
}

export type FormatConversionPrevious = {
  id: string;
  verdict: ScreeningVerdict;
  scope: ScreeningScope;
  examined_chars: number;
  source_chars: number;
};

/**
 * Nuova riga di screening dopo conversione di formato: stessi esito e conteggi,
 * nuova impronta sul testo salvato. Solo il comando di conversione la chiama.
 */
export async function recordFormatConversionScreening(
  client: AnyClient,
  input: {
    biographyId: string;
    fingerprint: string;
    previous: FormatConversionPrevious;
  }
): Promise<{ id: string }> {
  if (!/^[0-9a-f]{64}$/.test(input.fingerprint)) {
    throw new Error('format_conversion_invalid_fingerprint');
  }
  const { data, error } = await client
    .from('publication_records')
    .insert({
      biography_id: input.biographyId,
      kind: 'screening',
      fingerprint: input.fingerprint,
      verdict: input.previous.verdict,
      scope: input.previous.scope,
      examined_chars: input.previous.examined_chars,
      source_chars: input.previous.source_chars,
      reason: FORMAT_CONVERSION_REASON,
      previous_record_id: input.previous.id,
    })
    .select('id')
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (error || !id) {
    throw new Error(`format_conversion_record_failed:${error?.message ?? 'no row'}`);
  }
  return { id };
}

export async function latestScreeningForConversion(
  client: AnyClient,
  biographyId: string
): Promise<FormatConversionPrevious | null> {
  const { data, error } = await client
    .from('publication_records')
    .select('id, verdict, scope, examined_chars, source_chars')
    .eq('biography_id', biographyId)
    .eq('kind', 'screening')
    .neq('verdict', 'text_changed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`format_conversion_read_failed:${error.message}`);
  const row = data as FormatConversionPrevious | null;
  if (!row?.id) return null;
  return row;
}

/**
 * Converte una scheda: legacy → Markdown → (se pubblicata) riga di screening.
 * Idempotente: campi già Markdown non si toccano e non finiscono in legacy.
 */
export async function applyMarkdownConversionToBiography(
  client: AnyClient,
  bio: BiographyConversionRow,
  sectionRows: SectionRow[],
  book: BookRow | undefined
): Promise<'converted' | 'skipped'> {
  const { decision, fields } = assessBiographyConversion(bio, sectionRows, book);
  if (decision === 'skip_unchanged') return 'skipped';
  if (decision === 'manual_review') {
    throw new Error(`manual_review:${bio.id}`);
  }

  verifyPlainTextIdentity(fields);

  for (const row of legacyRowsForFields(bio.id, fields)) {
    await ensureLegacyHtmlCopy(client, row);
  }

  const bookUpdate: Record<string, string> = {};
  if (book) {
    for (const name of BOOK_TEXT_FIELDS) {
      const value = book[name];
      if (typeof value === 'string' && value.trim() && looksLikeStoredHtml(value)) {
        bookUpdate[name] = storedToArchiveMarkdown(value);
      }
    }
  }

  const { error: bioError } = await client
    .from('biographies')
    .update({
      content: convertedContent(bio.content),
      content_freeflow:
        bio.content_freeflow != null && looksLikeStoredHtml(bio.content_freeflow)
          ? storedToArchiveMarkdown(bio.content_freeflow)
          : bio.content_freeflow,
      final_version:
        bio.final_version != null && looksLikeStoredHtml(bio.final_version)
          ? storedToArchiveMarkdown(bio.final_version)
          : bio.final_version,
    })
    .eq('id', bio.id);
  if (bioError) throw new Error(`biography_update_failed:${bioError.message}`);

  for (const section of sectionRows) {
    const nextContent =
      section.content != null && looksLikeStoredHtml(section.content)
        ? storedToArchiveMarkdown(section.content)
        : section.content;
    const nextHistory = convertedRevisionHistory(section);
    const historyChanged =
      nextHistory != null &&
      JSON.stringify(nextHistory) !== JSON.stringify(section.revision_history ?? []);
    if (nextContent === section.content && !historyChanged) continue;
    const patch: Record<string, unknown> = {};
    if (nextContent !== section.content) patch.content = nextContent;
    if (historyChanged) patch.revision_history = nextHistory;
    const { error } = await client.from('biography_sections').update(patch).eq('id', section.id);
    if (error) throw new Error(`section_update_failed:${error.message}`);
  }

  if (book && Object.keys(bookUpdate).length > 0) {
    const { error } = await client
      .from('biography_book_structure')
      .update(bookUpdate)
      .eq('biography_id', bio.id);
    if (error) throw new Error(`book_update_failed:${error.message}`);
  }

  // Ricontrollo dopo scrittura: il Markdown salvato non deve essere ripreso come HTML.
  const { data: afterBio, error: afterErr } = await client
    .from('biographies')
    .select('id, slug, title, um_id, status, content, content_freeflow, final_version')
    .eq('id', bio.id)
    .maybeSingle();
  if (afterErr || !afterBio) throw new Error(`biography_reread_failed:${afterErr?.message ?? 'missing'}`);
  const { data: afterSections, error: secErr } = await client
    .from('biography_sections')
    .select('id, biography_id, section_key, content, revision_history')
    .eq('biography_id', bio.id);
  if (secErr) throw new Error(`sections_reread_failed:${secErr.message}`);
  const { data: afterBookRows, error: bookErr } = await client
    .from('biography_book_structure')
    .select(['biography_id', ...BOOK_TEXT_FIELDS].join(', '))
    .eq('biography_id', bio.id)
    .maybeSingle();
  if (bookErr) throw new Error(`book_reread_failed:${bookErr.message}`);

  const after = afterBio as BiographyConversionRow;
  const afterAssessment = assessBiographyConversion(
    after,
    (afterSections ?? []) as SectionRow[],
    (afterBookRows as BookRow | null) ?? undefined
  );
  if (afterAssessment.decision !== 'skip_unchanged') {
    throw new Error(`post_convert_still_html:${bio.id}`);
  }
  for (const field of afterAssessment.fields) {
    const value = field.value ?? '';
    if (value.trim() && looksLikeStoredHtml(value)) {
      throw new Error(`post_convert_html_field:${field.path}`);
    }
  }
  verifyPlainTextIdentity(fields);

  if (bio.status === 'published') {
    const previous = await latestScreeningForConversion(client, bio.id);
    if (!previous) throw new Error(`no_screening_record:${bio.id}`);
    const fingerprint = await computePublicFingerprint(client, bio.id);
    if (!fingerprint) throw new Error(`fingerprint_missing:${bio.id}`);
    await recordFormatConversionScreening(client, {
      biographyId: bio.id,
      fingerprint,
      previous,
    });
  }

  return 'converted';
}
