import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { startAnalysisJob } from '@/lib/server/analysis-jobs';
import {
  buildServiceClient,
  checkPerUserThrottle,
  generateAndStoreExports,
  routeScreeningFailureToManualReview,
  runReviewSubmitScreening,
} from '@/lib/server/review-submit-pipeline';
import { isPdfScriptCovered } from '@/lib/pdf/covered-scripts';
import { editionOriginalBlock } from '@/lib/server/edition-publish';

type AnyClient = SupabaseClient<any, any, any>;

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

/**
 * Pubblicazione senza PDF per le scritture che il motore non copre.
 * La conferma esplicita dell'autore è l'equivalente dell'approvazione del PDF
 * e si registra nello stesso campo `final_pdf_approved_at`.
 * Dalla versione finale si passa al lock, senza `pdf_draft`.
 */
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

    const body = await req.json().catch(() => null);
    const biographyId = body?.biographyId as string | undefined;
    if (!biographyId) {
      return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
    }
    if (body?.confirmed !== true) {
      return NextResponse.json(
        { error: 'confirmation_required', message: 'The author must confirm the text.' },
        { status: 400 }
      );
    }

    const serviceClient = buildServiceClient();
    if (!(await checkPerUserThrottle(serviceClient, user.id, 'approve_text'))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, status, final_version, record_script')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if ((bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const originalBlock = await editionOriginalBlock(serviceClient, biographyId);
    if (originalBlock) {
      return NextResponse.json(originalBlock, { status: 409 });
    }
    if (isPdfScriptCovered((bio as { record_script?: string | null }).record_script)) {
      return NextResponse.json(
        { error: 'pdf_required', message: 'This writing is published through the PDF.' },
        { status: 400 }
      );
    }
    if ((bio as { status?: string }).status !== 'final_version') {
      return NextResponse.json(
        { error: 'invalid_status', message: 'Biography must be in final_version status' },
        { status: 400 }
      );
    }
    const finalV = (bio as { final_version?: string | null }).final_version;
    if (!finalV || finalV.trim().length < 50) {
      return NextResponse.json(
        { error: 'missing_final_text', message: 'Final version text is missing or too short.' },
        { status: 400 }
      );
    }

    await generateAndStoreExports(serviceClient, biographyId);

    const now = new Date().toISOString();
    const { error: lockErr } = await serviceClient
      .from('biographies')
      .update({
        status: 'locked_pending_screening',
        final_pdf_approved_at: now,
        ai_screening_status: 'pending',
      })
      .eq('id', biographyId);

    if (lockErr) {
      console.error('[approve-text] lock update error:', lockErr);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    try {
      const { jobId } = await startAnalysisJob(serviceClient, biographyId, 'screening', () =>
        runReviewSubmitScreening(serviceClient, biographyId)
      );
      return NextResponse.json({ jobId }, { status: 202 });
    } catch (e: unknown) {
      console.error('[approve-text] startAnalysisJob failed:', e);
      await routeScreeningFailureToManualReview(serviceClient, biographyId, 'start_failed');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  } catch (err) {
    console.error('[approve-text]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
