import { NextRequest, NextResponse } from 'next/server';
import { isPdfScriptCovered } from '@/lib/pdf/covered-scripts';
import { buildServiceClient } from '@/lib/server/service-client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

    // Dopo la verifica della sessione, le scritture sulle colonne riservate
    // (stato, pdf_draft_*) le fa il server con il ruolo di servizio: il trigger
    // guard di biographies le rifiuta se arrivano con la sessione dell'utente.
    const dbClient = buildServiceClient();

    const { data: bio } = await dbClient
      .from('biographies')
      .select('user_id, status, record_script, translation_of')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if ((bio as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isPdfScriptCovered((bio as { record_script?: string | null }).record_script)) {
      return NextResponse.json(
        { error: 'unsupported_script', message: 'This writing is published from the text, without a PDF.' },
        { status: 400 }
      );
    }
    if ((bio as any).status !== 'final_version') {
      return NextResponse.json(
        { error: 'invalid_status', message: 'Biography must be in final_version status' },
        { status: 400 }
      );
    }

    const { data: coverMedia } = await dbClient
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

    const now = new Date().toISOString();
    const { error: updErr } = await dbClient
      .from('biographies')
      .update({
        status: 'pdf_draft',
        pdf_draft_started_at: now,
        pdf_draft_iteration: null,
        draft_ai_feedback: null,
      })
      .eq('id', biographyId);

    if (updErr) {
      console.error('[start-pdf-draft] update error:', updErr);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'pdf_draft', pdf_draft_started_at: now });
  } catch (err) {
    console.error('[start-pdf-draft]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
