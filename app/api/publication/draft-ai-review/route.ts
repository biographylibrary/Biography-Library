import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  buildServiceClient,
  checkPerUserThrottle,
  fetchBiographyContent,
  runDraftAiReview,
} from '@/lib/server/review-submit-pipeline';

type AnyClient = SupabaseClient<any, any, any>;

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

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
    if (!biographyId) {
      return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
    }

    const serviceClient = buildServiceClient();

    if (!(await checkPerUserThrottle(serviceClient, user.id))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, status, pdf_draft_iteration')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if ((bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ((bio as { status?: string }).status !== 'pdf_draft') {
      return NextResponse.json(
        { error: 'invalid_status', message: 'Biography must be in pdf_draft status' },
        { status: 400 }
      );
    }

    const currentIteration = (bio as { pdf_draft_iteration?: number | null }).pdf_draft_iteration ?? null;
    if (currentIteration === 3) {
      return NextResponse.json({ error: 'max_drafts_reached' }, { status: 400 });
    }
    const nextIteration = ((currentIteration ?? 0) + 1) as 1 | 2 | 3;

    const { text } = await fetchBiographyContent(serviceClient, biographyId);
    const feedback = await runDraftAiReview(text, nextIteration);

    const { error: updErr } = await serviceClient
      .from('biographies')
      .update({
        pdf_draft_iteration: nextIteration,
        draft_ai_feedback: feedback,
      })
      .eq('id', biographyId);

    if (updErr) {
      console.error('[draft-ai-review] update error:', updErr);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      iteration: nextIteration,
      feedback,
    });
  } catch (err) {
    console.error('[draft-ai-review]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

