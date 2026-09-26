import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { readImportPdf } from '@/lib/server/read-import-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF_BYTES = 30 * 1024 * 1024;

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
      return NextResponse.json({ error: 'auth' }, { status: 401 });
    }

    const anonClient = buildAnonClient(jwt);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'auth' }, { status: 401 });
    }

    const form = await req.formData();
    const biographyId = String(form.get('biographyId') ?? '');
    const file = form.get('file');
    if (!biographyId || !(file instanceof File)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'too_large' }, { status: 413 });
    }

    const serviceClient = buildServiceClient();
    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id')
      .eq('id', biographyId)
      .maybeSingle();
    if (!bio || (bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const read = await readImportPdf(bytes);
    if (!read.hasText || !read.previewJpeg || !read.coverJpeg) {
      return NextResponse.json({ kind: 'scanned' });
    }

    return NextResponse.json({
      kind: 'text',
      bodyHasText: read.bodyHasText,
      htmlAll: read.htmlAll,
      htmlAfterCover: read.htmlAfterCover,
      previewJpegBase64: read.previewJpeg.toString('base64'),
      coverJpegBase64: read.coverJpeg.toString('base64'),
    });
  } catch (err) {
    console.error('[api/import/pdf]', err);
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
}
