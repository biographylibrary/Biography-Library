import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { startAnalysisJob } from '@/lib/server/analysis-jobs';
import {
  buildServiceClient,
  checkPerUserThrottle,
  fetchBiographyContent,
} from '@/lib/server/review-submit-pipeline';
import {
  canRunPreprintCheck,
  recordPreprintCheckRun,
  resolveContentFingerprintForPreprint,
  runPreprintCheck,
} from '@/lib/server/preprint-check';

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

    if (!(await checkPerUserThrottle(serviceClient, user.id, 'preprint_check'))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, status')
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

    const contentFingerprint = await resolveContentFingerprintForPreprint(
      serviceClient,
      biographyId
    );
    if (!contentFingerprint) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }

    const limit = await canRunPreprintCheck(serviceClient, biographyId, contentFingerprint);
    if (!limit.ok) {
      if (limit.reason === 'lookup_failed') {
        return NextResponse.json(
          { error: 'lookup_failed', message: 'Could not verify preprint check limits. Try again.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: limit.reason === 'same_fingerprint' ? 'already_checked' : 'limit_exhausted',
          reason: limit.reason,
        },
        { status: 409 }
      );
    }

    const { jobId } = await startAnalysisJob(serviceClient, biographyId, 'preprint_check', async () => {
      const { text, contentLanguage } = await fetchBiographyContent(serviceClient, biographyId);
      const feedback = await runPreprintCheck(text, contentLanguage, {
        userId: user.id,
        biographyId,
      });

      if (feedback.emptyText) {
        throw new Error('empty_text');
      }
      if (feedback.aiError) {
        throw new Error('ai_error');
      }

      await recordPreprintCheckRun(serviceClient, biographyId, contentFingerprint);

      const stored = { ...feedback, contentFingerprint };
      const { error: updErr } = await serviceClient
        .from('biographies')
        .update({ draft_ai_feedback: stored })
        .eq('id', biographyId);
      if (updErr) throw new Error(`Update failed: ${updErr.message}`);

      return { feedback: stored };
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    console.error('[preprint-check]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
