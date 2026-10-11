import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  resolveBiographyId,
  verifyBiographyViewAccess,
} from '@/lib/server/biography-view-access';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { resolveMediaOwnerId, type MediaOwnerClient } from '@/lib/edition-media-owner';

function storagePathFromFileUrl(fileUrl: string): string {
  try {
    const parts = new URL(fileUrl).pathname.split('/biography-photos/');
    if (parts[1]) return decodeURIComponent(parts[1]);
  } catch {
    /* ignore */
  }
  return fileUrl;
}

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

/**
 * Copertina per chi può leggere la scheda (stesso accesso di gallery-photos).
 * Foto sempre dal proprietario dei media (originale se edizione).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = buildServiceClient();
    const biographyId = await resolveBiographyId(service, params.id);
    if (!biographyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const shareToken = req.nextUrl.searchParams.get('shareToken');
    const userId = await getOptionalUserId(req);
    const access = await verifyBiographyViewAccess(service, biographyId, {
      shareToken,
      userId,
    });

    if (!access.ok) {
      return NextResponse.json({ error: 'Access denied' }, { status: access.status });
    }

    const mediaOwnerId = await resolveMediaOwnerId(service as unknown as MediaOwnerClient, biographyId);
    const { data: rows } = await service
      .from('biography_media')
      .select('file_url, layout')
      .eq('biography_id', mediaOwnerId)
      .in('layout', ['cover', 'cover_a5'])
      .order('layout', { ascending: true })
      .limit(2);

    const list = (rows as { file_url: string; layout: string }[] | null) ?? [];
    const preferCover =
      list.find((r) => r.layout === 'cover') ?? list.find((r) => r.layout === 'cover_a5');
    if (!preferCover?.file_url) {
      return NextResponse.json({ url: null });
    }

    const storagePath = storagePathFromFileUrl(preferCover.file_url);
    const { data: signed } = await service.storage
      .from('biography-photos')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({ url: signed?.signedUrl ?? preferCover.file_url });
  } catch (err) {
    console.error('[api/biography/cover-photo]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
