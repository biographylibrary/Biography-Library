import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BOOK_STRUCTURE_SELECT,
  selectBookParts,
  type BookPart,
  type BookStructureRow,
} from '@/lib/book-parts';
import {
  resolveBiographyId,
  verifyBiographyViewAccess,
} from '@/lib/server/biography-view-access';
import { buildServiceClient } from '@/lib/server/service-client';

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

function toClientPart(part: BookPart): { key: string; text: string; source?: string } {
  if (part.source) return { key: part.key, text: part.text, source: part.source };
  return { key: part.key, text: part.text };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { data: structure, error } = await service
      .from('biography_book_structure')
      .select(BOOK_STRUCTURE_SELECT)
      .eq('biography_id', biographyId)
      .maybeSingle();

    if (error) {
      console.error('[api/biography/book-parts] structure', error);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    const { front, back } = selectBookParts(structure as BookStructureRow | null);
    return NextResponse.json(
      {
        front: front.map(toClientPart),
        back: back.map(toClientPart),
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (err) {
    console.error('[api/biography/book-parts]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
