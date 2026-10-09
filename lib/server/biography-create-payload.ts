import { isContentLicenseUri } from '@/lib/rights';
import { textLanguageIdentity } from '@/lib/text-languages';

function nfc(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC').trim();
}

export type CreateBiographyBody = {
  title?: string;
  visibility?: 'private' | 'link-only' | 'public';
  biographyMode?: 'sections' | 'freeflow';
  authorName?: string;
  biographyType?: 'autobiography' | 'memorial';
  contentLanguage?: string;
  subjectName?: string | null;
  rightsStatementUri?: string | null;
};

export type CreateBiographyPayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; status: 400; error: string };

/**
 * Riga che POST /api/biography/create inserisce (con la sessione dell'utente, così
 * le policy RLS verificano proprietà e account attivo). Pura: la usano la rotta e
 * i test. Non contiene nessuna colonna riservata al server tranne `status: 'draft'`
 * e `schema_version: 2`, che coincidono con i valori predefiniti richiesti dal
 * trigger guard.
 */
export function buildBiographyInsertPayload(
  userId: string,
  body: CreateBiographyBody,
  now: string
): CreateBiographyPayloadResult {
  const biographyType = body.biographyType === 'memorial' ? 'memorial' : 'autobiography';
  const visibility = body.visibility ?? 'private';
  const biographyMode = body.biographyMode === 'freeflow' ? 'freeflow' : 'sections';
  const language = textLanguageIdentity(body.contentLanguage) ?? textLanguageIdentity('en');
  if (!language) {
    return { ok: false, status: 400, error: 'Invalid text language' };
  }

  const titleRaw = nfc(body.title);
  const authorName = nfc(body.authorName);
  const subjectName = biographyType === 'memorial' ? nfc(body.subjectName) || titleRaw : null;
  const title = biographyType === 'memorial' ? subjectName || titleRaw : titleRaw;

  if (!title) {
    return { ok: false, status: 400, error: 'Title is required' };
  }

  const rightsUri = body.rightsStatementUri?.trim() || null;
  if (visibility === 'public') {
    if (!isContentLicenseUri(rightsUri)) {
      return {
        ok: false,
        status: 400,
        error: "una biografia pubblica richiede una licenza registrata: manca la scelta dell'autore",
      };
    }
  }

  const nameAsWritten = biographyType === 'memorial' ? subjectName || title : title;

  const payload: Record<string, unknown> = {
    user_id: userId,
    title,
    subject_name: subjectName,
    visibility,
    status: 'draft',
    content: {},
    biography_mode: biographyMode,
    biography_type: biographyType,
    author_name: authorName,
    schema_version: 2,
    record_language_tag: language.tag,
    record_script: language.script,
    record_direction: language.direction,
    record_language_endonym: language.endonym,
    name_as_written: nameAsWritten,
  };

  if (visibility === 'public' && rightsUri) {
    payload.rights_statement_uri = rightsUri;
    payload.rights_chosen_at = now;
    payload.rights_holder = authorName || null;
  }

  return { ok: true, payload };
}
