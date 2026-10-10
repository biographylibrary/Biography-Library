import { textLanguageIdentity } from '@/lib/text-languages';
import { originalVersionTimestamp } from '@/lib/edition-drift';
import { getEmptyContent, type BiographyContent } from '@/lib/editor-constants';
import { htmlHasText, listChapterAnchors } from '@/lib/editor/single-document';
import { looksLikeStoredHtml } from '@/lib/archive-markdown';
import type { AnyClient } from '@/lib/server/service-client';

export type StartFrom = 'copy' | 'blank';

export type CreateEditionBody = {
  originalId?: unknown;
  languageTag?: unknown;
  startFrom?: unknown;
};

export type CreateEditionErrorCode =
  | 'invalid_language'
  | 'not_found'
  | 'forbidden'
  | 'original_is_edition'
  | 'frozen'
  | 'original_not_published'
  | 'language_already_present';

export type CreateEditionDecision =
  | { ok: true; language: NonNullable<ReturnType<typeof textLanguageIdentity>>; startFrom: StartFrom }
  | { ok: false; status: 400 | 403 | 404 | 409; error: CreateEditionErrorCode };

export type OriginalForEdition = {
  id: string;
  user_id: string;
  translation_of: string | null;
  status: string;
  is_frozen: boolean | null;
  biography_type: string | null;
  title: string | null;
  author_name: string | null;
  subject_name: string | null;
  name_as_written: string | null;
  name_given: string | null;
  name_family: string | null;
  name_order: string | null;
  name_romanized: string | null;
  romanization_system: string | null;
  biography_mode: string | null;
  content: unknown;
  content_freeflow: string | null;
  narrative_order: unknown;
  visibility: string | null;
  rights_statement_uri: string | null;
  rights_chosen_at: string | null;
  rights_holder: string | null;
  consent_basis: string | null;
  consent_recorded_at: string | null;
  record_language_tag: string | null;
  revised_at: string | null;
  published_at: string | null;
};

function nfc(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC');
}

export function parseCreateEditionBody(
  body: CreateEditionBody
): CreateEditionDecision | { ok: false; status: 400; error: 'invalid_request' } {
  const language = textLanguageIdentity(
    typeof body.languageTag === 'string' ? body.languageTag : null
  );
  if (!language) {
    return { ok: false, status: 400, error: 'invalid_language' };
  }
  if (typeof body.originalId !== 'string' || !body.originalId.trim()) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const startFrom = body.startFrom === 'blank' || body.startFrom === 'copy' ? body.startFrom : null;
  if (!startFrom) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  return { ok: true, language, startFrom };
}

/** Controlli sul record originale e sulle lingue già presenti, nell'ordine richiesto. */
export function decideCreateEdition(input: {
  userId: string;
  languageTag: string;
  original: OriginalForEdition | null;
  existingTags: readonly string[];
}): { ok: true } | { ok: false; status: 403 | 404 | 409; error: CreateEditionErrorCode } {
  if (!input.original) {
    return { ok: false, status: 404, error: 'not_found' };
  }
  if (input.original.user_id !== input.userId) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  if (input.original.translation_of) {
    return { ok: false, status: 409, error: 'original_is_edition' };
  }
  if (input.original.is_frozen) {
    return { ok: false, status: 409, error: 'frozen' };
  }
  if (input.original.status !== 'published') {
    return { ok: false, status: 409, error: 'original_not_published' };
  }
  const wanted = input.languageTag;
  const occupied = new Set(
    [input.original.record_language_tag, ...input.existingTags]
      .map((t) => t?.trim())
      .filter((t): t is string => Boolean(t))
  );
  if (occupied.has(wanted)) {
    return { ok: false, status: 409, error: 'language_already_present' };
  }
  return { ok: true };
}

function nfcContent(content: unknown): BiographyContent {
  const empty = getEmptyContent();
  if (!content || typeof content !== 'object') return empty;
  const src = content as Record<string, { text?: string; todo?: boolean; audioTranscript?: string }>;
  const out: BiographyContent = { ...empty };
  for (const [key, value] of Object.entries(src)) {
    if (!value || typeof value !== 'object') continue;
    out[key] = {
      text: nfc(value.text ?? ''),
      todo: false,
      audioTranscript: '',
    };
  }
  return out;
}

function blankContent(content: unknown): BiographyContent {
  const copied = nfcContent(content);
  const out: BiographyContent = getEmptyContent();
  for (const key of Object.keys(copied)) {
    out[key] = { text: '', todo: false, audioTranscript: '' };
  }
  return out;
}

/** Foglio vuoto con le stesse intestazioni di capitolo, senza il testo. */
export function blankFreeflowFrom(original: string | null | undefined): string {
  const stored = original ?? '';
  if (!htmlHasText(stored)) return '';
  const anchors = listChapterAnchors(stored);
  if (anchors.length === 0) return '';
  if (looksLikeStoredHtml(stored)) {
    return anchors.map((a) => `<h1>${escapeHtml(a.title)}</h1>`).join('');
  }
  return anchors.map((a) => `# ${a.title}`).join('\n\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildEditionTextFields(
  original: OriginalForEdition,
  startFrom: StartFrom
): {
  content: BiographyContent;
  content_freeflow: string;
  narrative_order: string[] | null;
  biography_mode: string;
} {
  const mode = original.biography_mode === 'freeflow' ? 'freeflow' : 'sections';
  const order = Array.isArray(original.narrative_order)
    ? (original.narrative_order as string[])
    : null;
  if (startFrom === 'copy') {
    return {
      content: nfcContent(original.content),
      content_freeflow: nfc(original.content_freeflow),
      narrative_order: order,
      biography_mode: mode,
    };
  }
  return {
    content: blankContent(original.content),
    content_freeflow: blankFreeflowFrom(original.content_freeflow),
    narrative_order: order,
    biography_mode: mode,
  };
}

export function buildEditionInsertRow(input: {
  userId: string;
  original: OriginalForEdition;
  language: NonNullable<ReturnType<typeof textLanguageIdentity>>;
  startFrom: StartFrom;
}): Record<string, unknown> {
  const text = buildEditionTextFields(input.original, input.startFrom);
  const originalVersionAt = originalVersionTimestamp({
    revised_at: input.original.revised_at,
    published_at: input.original.published_at,
  });

  return {
    user_id: input.userId,
    translation_of: input.original.id,
    status: 'draft',
    schema_version: 2,
    biography_type: input.original.biography_type === 'memorial' ? 'memorial' : 'autobiography',
    title: nfc(input.original.title),
    author_name: nfc(input.original.author_name),
    subject_name: input.original.subject_name != null ? nfc(input.original.subject_name) : null,
    name_as_written: input.original.name_as_written != null ? nfc(input.original.name_as_written) : nfc(input.original.title),
    name_given: input.original.name_given != null ? nfc(input.original.name_given) : null,
    name_family: input.original.name_family != null ? nfc(input.original.name_family) : null,
    name_order: input.original.name_order,
    name_romanized: input.original.name_romanized != null ? nfc(input.original.name_romanized) : null,
    romanization_system: input.original.romanization_system,
    visibility: 'private',
    content: text.content,
    content_freeflow: text.content_freeflow,
    narrative_order: text.narrative_order,
    biography_mode: text.biography_mode,
    record_language_tag: input.language.tag,
    record_script: input.language.script,
    record_direction: input.language.direction,
    record_language_endonym: input.language.endonym,
    rights_statement_uri: input.original.rights_statement_uri,
    rights_chosen_at: input.original.rights_chosen_at,
    rights_holder: input.original.rights_holder,
    consent_basis: input.original.consent_basis,
    consent_recorded_at: input.original.consent_recorded_at,
    original_version_at: originalVersionAt,
  };
}

const ORIGINAL_SELECT =
  'id, user_id, translation_of, status, is_frozen, biography_type, title, author_name, subject_name, name_as_written, name_given, name_family, name_order, name_romanized, romanization_system, biography_mode, content, content_freeflow, narrative_order, visibility, rights_statement_uri, rights_chosen_at, rights_holder, consent_basis, consent_recorded_at, record_language_tag, revised_at, published_at';

export function isLanguageUniqueViolation(message: string): boolean {
  return (
    /biographies_one_language_per_work/i.test(message) ||
    (/duplicate key/i.test(message) && /record_language_tag|one_language/i.test(message))
  );
}

/**
 * Crea l'edizione con il client di servizio. Se la copia del testo fallisce
 * a metà (qui: dopo l'insert), elimina la riga e risponde 500.
 */
export async function createEditionWithService(
  client: AnyClient,
  userId: string,
  body: CreateEditionBody
): Promise<
  | { ok: true; id: string }
  | { ok: false; status: number; error: string }
> {
  const parsed = parseCreateEditionBody(body);
  if (!parsed.ok) {
    return { ok: false, status: parsed.status, error: parsed.error };
  }

  const { data: original, error: loadError } = await client
    .from('biographies')
    .select(ORIGINAL_SELECT)
    .eq('id', body.originalId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, status: 500, error: loadError.message };
  }

  const { data: siblings, error: sibError } = await client
    .from('biographies')
    .select('record_language_tag')
    .eq('translation_of', body.originalId);

  if (sibError) {
    return { ok: false, status: 500, error: sibError.message };
  }

  const existingTags = ((siblings ?? []) as { record_language_tag?: string | null }[]).map(
    (r) => r.record_language_tag ?? ''
  );

  const decision = decideCreateEdition({
    userId,
    languageTag: parsed.language.tag,
    original: (original as OriginalForEdition | null) ?? null,
    existingTags,
  });
  if (!decision.ok) {
    return { ok: false, status: decision.status, error: decision.error };
  }

  const row = buildEditionInsertRow({
    userId,
    original: original as OriginalForEdition,
    language: parsed.language,
    startFrom: parsed.startFrom,
  });

  const { data: inserted, error: insertError } = await client
    .from('biographies')
    .insert(row)
    .select('id')
    .maybeSingle();

  if (insertError) {
    const message = insertError.message ?? '';
    if (isLanguageUniqueViolation(message)) {
      return { ok: false, status: 409, error: 'language_already_present' };
    }
    return { ok: false, status: 500, error: message };
  }

  const id = (inserted as { id?: string } | null)?.id;
  if (!id) {
    return { ok: false, status: 500, error: 'Insert returned no row' };
  }

  return { ok: true, id };
}

/**
 * Variante usata nei test: dopo l'insert esegue un passo di copia che può fallire;
 * in quel caso elimina l'edizione.
 */
export async function createEditionWithCopyStep(
  client: AnyClient,
  userId: string,
  body: CreateEditionBody,
  copyStep?: (editionId: string) => Promise<void>
): Promise<
  | { ok: true; id: string }
  | { ok: false; status: number; error: string }
> {
  const created = await createEditionWithService(client, userId, body);
  if (!created.ok) return created;
  if (!copyStep) return created;
  try {
    await copyStep(created.id);
    return created;
  } catch (err) {
    await client.from('biographies').delete().eq('id', created.id);
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : 'copy_failed',
    };
  }
}
