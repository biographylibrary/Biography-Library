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
import { generateUploadFinalPdf } from '@/lib/server/final-pdf-artifacts';
import { resolveRecordLanguageTag } from '@/lib/record-language';
import { isPdfScriptCovered } from '@/lib/pdf/covered-scripts';
import { editionIdenticalBlock, editionOriginalBlock } from '@/lib/server/edition-publish';

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

    if (!(await checkPerUserThrottle(serviceClient, user.id, 'approve_final_pdf'))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, status, pdf_draft_iteration, final_version, record_language_tag, record_script, translation_of')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if ((bio as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const originalBlock = await editionOriginalBlock(serviceClient, biographyId);
    if (originalBlock) {
      return NextResponse.json(originalBlock, { status: 409 });
    }
    const identicalBlock = await editionIdenticalBlock(serviceClient, biographyId);
    if (identicalBlock) {
      return NextResponse.json(identicalBlock, { status: 409 });
    }
    if (!isPdfScriptCovered((bio as { record_script?: string | null }).record_script)) {
      return NextResponse.json(
        { error: 'unsupported_script', message: 'This writing is published from the text, without a PDF.' },
        { status: 400 }
      );
    }
    if ((bio as any).status !== 'pdf_draft') {
      return NextResponse.json(
        { error: 'invalid_status', message: 'Biography must be in pdf_draft status' },
        { status: 400 }
      );
    }

    const iter = (bio as any).pdf_draft_iteration as number | null;
    if (iter == null || iter < 1) {
      return NextResponse.json(
        {
          error: 'drafts_required',
          message: 'Generate at least one watermarked draft PDF before final approval.',
        },
        { status: 400 }
      );
    }

    const finalV = (bio as any).final_version as string | null | undefined;
    if (!finalV || finalV.trim().length < 50) {
      return NextResponse.json(
        { error: 'missing_final_text', message: 'Final version text is missing or too short.' },
        { status: 400 }
      );
    }

    const { data: coverMedia } = await serviceClient
      .from('biography_media')
      .select('id')
      .eq('biography_id', (bio as { translation_of?: string | null }).translation_of || biographyId)
      .in('layout', ['cover', 'cover_a5'])
      .limit(1)
      .maybeSingle();

    if (!coverMedia) {
      return NextResponse.json(
        { error: 'missing_cover', message: 'Cover photo required' },
        { status: 400 }
      );
    }

    const contentLanguage: string = resolveRecordLanguageTag(bio as any);

    let finalPdfUrl: string;
    let listingCoverUrl: string | null = null;
    try {
      const artifacts = await generateUploadFinalPdf(serviceClient, biographyId, contentLanguage);
      finalPdfUrl = artifacts.finalPdfUrl;
      listingCoverUrl = artifacts.listingCoverUrl;
    } catch (e) {
      console.error('[approve-final-pdf] final PDF generation/upload failed:', e);
      return NextResponse.json(
        {
          error: 'final_pdf_failed',
          message: 'Could not generate or store the final PDF. Please try again.',
        },
        { status: 500 }
      );
    }

    await generateAndStoreExports(serviceClient, biographyId);

    const now = new Date().toISOString();
    const { error: lockErr } = await serviceClient
      .from('biographies')
      .update({
        status: 'locked_pending_screening',
        final_pdf_approved_at: now,
        pdf_draft_iteration: null,
        ai_screening_status: 'pending',
        final_pdf_url: finalPdfUrl,
        listing_cover_url: listingCoverUrl,
      })
      .eq('id', biographyId);

    if (lockErr) {
      console.error('[approve-final-pdf] lock update error:', lockErr);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // Il controllo finale (preprint) non blocca: solo lo screening di conformità decide.
    // Lo screening parte in background; PDF e URL sono già in riga biografia.
    try {
      const { jobId } = await startAnalysisJob(serviceClient, biographyId, 'screening', () =>
        runReviewSubmitScreening(serviceClient, biographyId)
      );
      return NextResponse.json({ jobId, finalPdfUrl, listingCoverUrl }, { status: 202 });
    } catch (e: any) {
      if (e?.message === 'Biography not found') {
        return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
      }
      console.error('[approve-final-pdf] startAnalysisJob failed:', e);
      await routeScreeningFailureToManualReview(serviceClient, biographyId, 'start_failed');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  } catch (err) {
    console.error('[approve-final-pdf]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
