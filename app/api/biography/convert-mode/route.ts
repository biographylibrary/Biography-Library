import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { convertBiographyMode } from '@/lib/echo/biography-mode-convert';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

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
    const toMode = body?.toMode as 'sections' | 'freeflow' | undefined;

    if (!biographyId || !toMode) {
      return NextResponse.json({ error: 'biographyId and toMode required' }, { status: 400 });
    }

    const serviceClient = buildServiceClient();
    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id, biography_mode')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio || (bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fromMode = (bio as { biography_mode?: string }).biography_mode as 'sections' | 'freeflow';
    const result = await convertBiographyMode(serviceClient, biographyId, fromMode, toMode);

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Conversion failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, biographyMode: toMode });
  } catch (err) {
    console.error('[api/biography/convert-mode]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
