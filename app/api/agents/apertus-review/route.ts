import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { runApertusSectionReview } from '@/lib/agents/apertus-review';
import {
  buildServiceClient,
  checkPerUserThrottle,
} from '@/lib/server/review-submit-pipeline';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

type AnyClient = SupabaseClient<any, any, any>;

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

type BiographyContent = Record<string, { text?: string }>;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const anonClient = buildAnonClient(jwt);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const biographyId = body?.biographyId as string | undefined;
    const sectionKey = body?.sectionKey as string | undefined;
    const language = (body?.language as string | undefined) ?? 'en';

    if (!biographyId || !sectionKey) {
      return NextResponse.json({ error: 'biographyId and sectionKey are required' }, { status: 400 });
    }

    if (sectionKey !== 'freeflow' && !BIOGRAPHY_SECTIONS.some((s) => s.key === sectionKey)) {
      return NextResponse.json({ error: 'Invalid sectionKey' }, { status: 400 });
    }

    const serviceClient = buildServiceClient();

    if (!(await checkPerUserThrottle(serviceClient, user.id))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, content, content_freeflow, content_language, status')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if ((bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ((bio as { status?: string }).status === 'published') {
      return NextResponse.json({ error: 'Biography is published and locked' }, { status: 400 });
    }

    let sectionText = '';
    if (sectionKey === 'freeflow') {
      sectionText = (bio as { content_freeflow?: string }).content_freeflow ?? '';
    } else {
      const content = (bio as { content?: BiographyContent }).content ?? {};
      sectionText = content[sectionKey]?.text ?? '';
    }

    if (!sectionText.trim()) {
      return NextResponse.json({ error: 'Section is empty' }, { status: 400 });
    }

    const sectionTitle =
      BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey)?.title ?? sectionKey;

    const contentLanguage =
      (body?.language as string | undefined) ??
      (bio as { content_language?: string }).content_language ??
      'en';

    const result = await runApertusSectionReview(
      sectionTitle,
      sectionText,
      language || contentLanguage
    );

    if (result.aiError || !result.review) {
      return NextResponse.json(
        { error: 'Apertus review unavailable. Please try again later.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      review: result.review,
      modelUsed: result.modelUsed,
      sectionKey,
    });
  } catch (err) {
    console.error('[api/agents/apertus-review]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
