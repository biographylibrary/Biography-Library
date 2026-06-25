import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getBiographySectionEntries,
  isViewLanguage,
  sectionContentHash,
  translateSectionHtml,
  type ViewLanguage,
} from '@/lib/biography-view-translate';
import {
  resolveBiographyId,
  verifyBiographyViewAccess,
} from '@/lib/server/biography-view-access';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

function buildAnonAuthClient(jwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

async function getOptionalUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return null;
  const client = buildAnonAuthClient(jwt);
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetLanguage = body?.targetLanguage as string | undefined;
    const shareToken = (body?.shareToken as string | undefined)?.trim() || null;

    if (!targetLanguage || !isViewLanguage(targetLanguage)) {
      return NextResponse.json({ error: 'Invalid targetLanguage' }, { status: 400 });
    }

    const biographyId = await resolveBiographyId(buildServiceClient(), params.id);
    if (!biographyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const userId = await getOptionalUserId(req);
    const service = buildServiceClient();
    const access = await verifyBiographyViewAccess(service, biographyId, {
      shareToken,
      userId,
    });

    if (!access.ok) {
      return NextResponse.json({ error: 'Access denied' }, { status: access.status });
    }

    const bio = access.biography;
    const sourceLanguage = (bio.content_language ?? 'en') as ViewLanguage;
    if (!isViewLanguage(sourceLanguage)) {
      return NextResponse.json({ error: 'Unsupported source language' }, { status: 400 });
    }

    if (targetLanguage === sourceLanguage) {
      return NextResponse.json({ error: 'Target matches source language' }, { status: 400 });
    }

    const sections = getBiographySectionEntries(bio);
    if (!sections.length) {
      return NextResponse.json({ error: 'No content to translate' }, { status: 400 });
    }

    const { data: existingRows } = await service
      .from('biography_view_translations')
      .select('section_key, translated_html, source_content_hash')
      .eq('biography_id', biographyId)
      .eq('target_language', targetLanguage);

    const cachedByKey = new Map(
      (existingRows ?? []).map((row) => {
        const r = row as {
          section_key: string;
          translated_html: string;
          source_content_hash: string;
        };
        return [r.section_key, r] as const;
      })
    );

    const translatedSections: Record<string, string> = {};
    let usedAi = false;

    for (const section of sections) {
      const hash = sectionContentHash(section.html);
      const cached = cachedByKey.get(section.key);
      if (cached && cached.source_content_hash === hash) {
        translatedSections[section.key] = cached.translated_html;
        continue;
      }

      usedAi = true;
      const translatedHtml = await translateSectionHtml(
        section.html,
        sourceLanguage,
        targetLanguage
      );

      const { error: upsertError } = await service.from('biography_view_translations').upsert(
        {
          biography_id: biographyId,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          section_key: section.key,
          translated_html: translatedHtml,
          source_content_hash: hash,
          requested_by: userId,
        },
        { onConflict: 'biography_id,target_language,section_key' }
      );

      if (upsertError) {
        console.error('[translate-view] upsert failed', upsertError);
        return NextResponse.json({ error: 'Failed to save translation' }, { status: 500 });
      }

      translatedSections[section.key] = translatedHtml;
    }

    return NextResponse.json({
      sections: translatedSections,
      sourceLanguage,
      targetLanguage,
      fromCache: !usedAi,
    });
  } catch (err) {
    console.error('[api/biography/translate-view]', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('INFOMANIAK_AI_TOKEN')) {
      return NextResponse.json({ error: 'Translation service unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 });
  }
}
