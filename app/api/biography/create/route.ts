import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { mintUmIdFor } from '@/lib/server/um-id-registry';
import { ONE_BIOGRAPHY_PER_USER_ERROR } from '@/lib/biography-limits';
import { isContentLicenseUri } from '@/lib/rights';

const LANGUAGE_ENDONYMS: Record<string, string> = {
  it: 'italiano',
  en: 'English',
  fr: 'français',
  de: 'Deutsch',
};

function nfc(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC').trim();
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    title?: string;
    visibility?: 'private' | 'link-only' | 'public';
    biographyMode?: 'sections' | 'freeflow';
    authorName?: string;
    biographyType?: 'autobiography' | 'memorial';
    contentLanguage?: string;
    subjectName?: string | null;
    rightsStatementUri?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const biographyType = body.biographyType === 'memorial' ? 'memorial' : 'autobiography';
  const visibility = body.visibility ?? 'private';
  const biographyMode = body.biographyMode === 'freeflow' ? 'freeflow' : 'sections';
  const contentLanguage = ['en', 'it', 'fr', 'de'].includes(body.contentLanguage ?? '')
    ? (body.contentLanguage as string)
    : 'en';

  const titleRaw = nfc(body.title);
  const authorName = nfc(body.authorName);
  const subjectName =
    biographyType === 'memorial' ? nfc(body.subjectName) || titleRaw : null;
  const title = biographyType === 'memorial' ? subjectName || titleRaw : titleRaw;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const rightsUri = body.rightsStatementUri?.trim() || null;
  if (visibility === 'public') {
    if (!isContentLicenseUri(rightsUri)) {
      return NextResponse.json(
        {
          error:
            'una biografia pubblica richiede una licenza registrata: manca la scelta dell\'autore',
        },
        { status: 400 }
      );
    }
  }

  const nameAsWritten = biographyType === 'memorial' ? subjectName || title : title;
  const now = new Date().toISOString();

  const insertPayload: Record<string, unknown> = {
    user_id: auth.user.id,
    title,
    subject_name: subjectName,
    visibility,
    status: 'draft',
    content: {},
    biography_mode: biographyMode,
    biography_type: biographyType,
    content_language: contentLanguage,
    author_name: authorName,
    schema_version: 2,
    record_language_tag: contentLanguage,
    record_script: 'Latn',
    record_direction: 'ltr',
    record_language_endonym: LANGUAGE_ENDONYMS[contentLanguage] ?? contentLanguage,
    name_as_written: nameAsWritten,
  };

  if (visibility === 'public' && rightsUri) {
    insertPayload.rights_statement_uri = rightsUri;
    insertPayload.rights_chosen_at = now;
    insertPayload.rights_holder = authorName || null;
  }

  const { data, error } = await auth.anonClient
    .from('biographies')
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) {
    const message = error.message ?? '';
    if (message.includes('one_biography_per_user')) {
      return NextResponse.json({ error: ONE_BIOGRAPHY_PER_USER_ERROR }, { status: 409 });
    }
    if (message.includes('licenza registrata')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 });
  }

  try {
    const minted = await mintUmIdFor(buildServiceClient(), data.id as string);
    const { data: withUm, error: refetchError } = await auth.anonClient
      .from('biographies')
      .select()
      .eq('id', data.id)
      .maybeSingle();

    if (refetchError) {
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: withUm ?? { ...data, um_id: minted.umIdNormalized },
      umIdCanonical: minted.umIdCanonical,
    });
  } catch (mintErr) {
    const msg = mintErr instanceof Error ? mintErr.message : 'UM mint failed';
    return NextResponse.json({ error: msg, data }, { status: 500 });
  }
}
