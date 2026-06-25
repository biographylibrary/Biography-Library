import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const biographyId = await resolveBiographyId(buildServiceClient(), params.id);
    if (!biographyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const shareToken = req.nextUrl.searchParams.get('shareToken');
    const userId = await getOptionalUserId(req);
    const access = await verifyBiographyViewAccess(buildServiceClient(), biographyId, {
      shareToken,
      userId,
    });

    if (!access.ok) {
      return NextResponse.json({ error: 'Access denied' }, { status: access.status });
    }

    const sourceLanguage = access.biography.content_language ?? 'en';
    const service = buildServiceClient();
    const { data: rows } = await service
      .from('biography_view_translations')
      .select('target_language')
      .eq('biography_id', biographyId);

    const availableTargets = Array.from(
      new Set(
        (rows ?? [])
          .map((r) => (r as { target_language?: string }).target_language)
          .filter((lang): lang is string => !!lang && lang !== sourceLanguage)
      )
    ).sort();

    return NextResponse.json({
      sourceLanguage,
      availableTargets,
    });
  } catch (err) {
    console.error('[api/biography/available-languages]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
