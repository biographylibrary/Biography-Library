import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  resolveBiographyId,
  verifyBiographyViewAccess,
} from '@/lib/server/biography-view-access';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

const GALLERY_LAYOUTS = ['full-page', 'two-vertical', 'two-horizontal', 'three-mixed'] as const;

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

    const { data: rows } = await service
      .from('biography_media')
      .select('id, file_url, caption, layout, display_order')
      .eq('biography_id', biographyId)
      .in('layout', [...GALLERY_LAYOUTS])
      .order('display_order', { ascending: true });

    const photos = await Promise.all(
      (rows ?? []).map(async (row) => {
        const r = row as {
          id: string;
          file_url: string;
          caption?: string | null;
          layout: string;
        };
        const storagePath = storagePathFromFileUrl(r.file_url);
        const { data: signed } = await service.storage
          .from('biography-photos')
          .createSignedUrl(storagePath, 3600);
        return {
          id: r.id,
          url: signed?.signedUrl ?? r.file_url,
          caption: r.caption?.trim() || null,
          layout: r.layout,
        };
      })
    );

    return NextResponse.json({ photos });
  } catch (err) {
    console.error('[api/biography/gallery-photos]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
