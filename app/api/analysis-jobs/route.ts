import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisJobKind } from '@/lib/analysis-job-constants';
import { getLatestJob } from '@/lib/server/analysis-jobs';
import { buildServiceClient, STAFF_ROLES } from '@/lib/server/review-submit-pipeline';

type AnyClient = SupabaseClient<any, any, any>;

const KINDS = new Set<AnalysisJobKind>(['screening', 'preprint_check']);

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

export async function GET(req: NextRequest) {
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

    const biographyId = req.nextUrl.searchParams.get('biographyId')?.trim() ?? '';
    const kind = req.nextUrl.searchParams.get('kind')?.trim() as AnalysisJobKind | undefined;
    if (!biographyId || !kind || !KINDS.has(kind)) {
      return NextResponse.json(
        { error: 'biographyId and kind (screening|preprint_check) are required' },
        { status: 400 }
      );
    }

    const serviceClient = buildServiceClient();
    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isStaff = STAFF_ROLES.has((callerProfile as { role?: string } | null)?.role ?? 'user');

    const { data: bio } = await serviceClient
      .from('biographies')
      .select('user_id')
      .eq('id', biographyId)
      .maybeSingle();
    if (!bio) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }
    if (!isStaff && (bio as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latest = await getLatestJob(serviceClient, biographyId, kind);
    if (latest.status === 'none') {
      return NextResponse.json({ status: 'none' });
    }
    return NextResponse.json({
      status: latest.status,
      jobId: latest.jobId,
      outcome: latest.outcome,
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt,
    });
  } catch (err) {
    console.error('[analysis-jobs GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
