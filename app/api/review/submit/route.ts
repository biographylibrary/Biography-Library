import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { startAnalysisJob } from '@/lib/server/analysis-jobs';
import {
  buildServiceClient,
  checkPerUserThrottle,
  generateAndStoreExports,
  routeScreeningFailureToManualReview,
  runReviewSubmitScreening,
  STAFF_ROLES,
} from '@/lib/server/review-submit-pipeline';
import { editionIdenticalBlock, editionOriginalBlock } from '@/lib/server/edition-publish';

type AnyClient = SupabaseClient<any, any, any>;

/** Da questi stati l'autore manda la scheda in coda di pubblicazione. */
const AUTHOR_SUBMIT_STATUSES = new Set(['draft', 'sections_complete', 'final_version']);

/**
 * Ripetere lo screening sullo STESSO testo dopo che l'analisi automatica è fallita
 * ("Riprova analisi"): il testo è bloccato, non cambia. Solo con un errore dell'analisi,
 * mai con 'pending' (screening in corso) né con passaggi segnalati (decide la persona).
 */
const AUTHOR_RETRY_STATUSES = new Set(['under_review', 'locked_pending_screening']);
const AUTHOR_RETRY_SCREENING = new Set(['ai_error', 'parse_error']);

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!jwt) {
      console.warn('[review/submit] 401 — no token', { timestamp });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const anonClient = buildAnonClient(jwt);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      console.warn('[review/submit] 401 — invalid token', { timestamp });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const callerId = user.id;

    const body = await req.json();
    const { biographyId } = body as { biographyId?: string };

    if (!biographyId) {
      return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
    }

    const serviceClient = buildServiceClient();

    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    const callerRole: string = (callerProfile as any)?.role ?? 'user';
    const isStaff = STAFF_ROLES.has(callerRole);

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, status, ai_screening_status')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      console.warn('[review/submit] 404 — biography not found', { timestamp, biographyId });
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }

    if (!isStaff) {
      if ((bio as any).user_id !== callerId) {
        console.warn('[review/submit] 403 — not owner', { timestamp, biographyId, callerId });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Da uno stato non d'autore (in revisione, sospesa, rimossa, pubblicata...)
      // l'autore non può rimettere la scheda in coda di pubblicazione.
      const isRetry =
        AUTHOR_RETRY_STATUSES.has((bio as any).status) &&
        AUTHOR_RETRY_SCREENING.has((bio as any).ai_screening_status);
      if (!AUTHOR_SUBMIT_STATUSES.has((bio as any).status) && !isRetry) {
        console.warn('[review/submit] 409 — status not submittable', {
          timestamp,
          biographyId,
          status: (bio as any).status,
        });
        return NextResponse.json({ error: 'invalid_status' }, { status: 409 });
      }
    }

    if (!(await checkPerUserThrottle(serviceClient, callerId, 'review_submit'))) {
      console.warn('[review/submit] 429 — throttled', { timestamp, biographyId, callerId });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const originalBlock = await editionOriginalBlock(serviceClient, biographyId);
    if (originalBlock) {
      return NextResponse.json(originalBlock, { status: 409 });
    }
    const identicalBlock = await editionIdenticalBlock(serviceClient, biographyId);
    if (identicalBlock) {
      return NextResponse.json(identicalBlock, { status: 409 });
    }

    const { data: coverMedia } = await serviceClient
      .from('biography_media')
      .select('id')
      .eq('biography_id', biographyId)
      .in('layout', ['cover', 'cover_a5'])
      .limit(1)
      .maybeSingle();

    if (!coverMedia) {
      return NextResponse.json(
        { error: 'missing_cover', message: 'Cover photo required before submission' },
        { status: 400 }
      );
    }

    // Lo stato di revisione lo scrive il server: l'autore non può scrivere queste colonne.
    const { error: statusError } = await serviceClient
      .from('biographies')
      .update({ status: 'under_review', ai_screening_status: 'pending' })
      .eq('id', biographyId);
    if (statusError) {
      console.error('[review/submit] status update failed:', statusError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    generateAndStoreExports(serviceClient, biographyId).catch((err) =>
      console.error('[review/submit] generateAndStoreExports uncaught:', err)
    );

    try {
      const { jobId } = await startAnalysisJob(serviceClient, biographyId, 'screening', () =>
        runReviewSubmitScreening(serviceClient, biographyId)
      );
      return NextResponse.json({ jobId }, { status: 202 });
    } catch (e: any) {
      if (e?.message === 'Biography not found') {
        return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
      }
      console.error('[review/submit] startAnalysisJob failed:', e);
      await routeScreeningFailureToManualReview(serviceClient, biographyId, 'start_failed');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  } catch (err) {
    console.error('[review/submit] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
