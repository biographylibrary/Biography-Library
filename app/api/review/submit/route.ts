import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  buildServiceClient,
  checkPerUserThrottle,
  generateAndStoreExports,
  runReviewSubmitScreening,
  STAFF_ROLES,
} from '@/lib/server/review-submit-pipeline';

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

    if (!isStaff) {
      const { data: bio } = await serviceClient
        .from('biographies')
        .select('user_id')
        .eq('id', biographyId)
        .maybeSingle();

      if (!bio) {
        console.warn('[review/submit] 404 — biography not found', { timestamp, biographyId });
        return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
      }

      if ((bio as any).user_id !== callerId) {
        console.warn('[review/submit] 403 — not owner', { timestamp, biographyId, callerId });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!(await checkPerUserThrottle(serviceClient, callerId))) {
      console.warn('[review/submit] 429 — throttled', { timestamp, biographyId, callerId });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { data: coverMedia } = await serviceClient
      .from('biography_media')
      .select('id')
      .eq('biography_id', biographyId)
      .eq('layout', 'cover')
      .limit(1)
      .maybeSingle();

    if (!coverMedia) {
      return NextResponse.json(
        { error: 'missing_cover', message: 'Cover photo required before submission' },
        { status: 400 }
      );
    }

    generateAndStoreExports(serviceClient, biographyId).catch((err) =>
      console.error('[review/submit] generateAndStoreExports uncaught:', err)
    );

    try {
      const result = await runReviewSubmitScreening(serviceClient, biographyId);
      if (result.result === 'published') {
        return NextResponse.json({
          result: 'published',
          screeningStatus: result.screeningStatus,
          isRescreen: result.isRescreen,
        });
      }
      return NextResponse.json({
        result: 'under_review',
        message: result.message,
        isRescreen: result.isRescreen,
        screeningDetail: result.screeningDetail,
        flagCount: result.flagCount,
      });
    } catch (e: any) {
      if (e?.message === 'Biography not found') {
        return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
      }
      throw e;
    }
  } catch (err) {
    console.error('[review/submit] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
