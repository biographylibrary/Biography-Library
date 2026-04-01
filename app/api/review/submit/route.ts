import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const INFOMANIAK_ENDPOINT = process.env.INFOMANIAK_AI_ENDPOINT ?? '';
const INFOMANIAK_TOKEN = process.env.INFOMANIAK_AI_TOKEN ?? '';
const INFOMANIAK_MODEL = process.env.INFOMANIAK_AI_MODEL ?? 'mistral3';

const MAX_CONTENT_CHARS = 6000;
const AI_TIMEOUT_MS = 30_000;

const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

const SUBMIT_THROTTLE_WINDOW_SECS = 60;
const SUBMIT_THROTTLE_MAX = 3;
const SUBMIT_CLEANUP_SECS = 300;

const AUTO_PUBLISHED_MESSAGES: Record<string, string> = {
  en: 'Your biography has been reviewed and published automatically.',
  it: 'La tua biografia è stata revisionata e pubblicata automaticamente.',
  fr: 'Votre biographie a été révisée et publiée automatiquement.',
  de: 'Ihre Biografie wurde automatisch geprüft und veröffentlicht.',
};

const REVIEW_ASSIGNED_MESSAGES: Record<string, string> = {
  en: 'A biography has been assigned to you for review.',
  it: 'Una biografia ti è stata assegnata per la revisione.',
  fr: 'Une biographie vous a été assignée pour révision.',
  de: 'Eine Biografie wurde Ihnen zur Überprüfung zugewiesen.',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

interface RejectedPassage {
  section_key: string;
  ai_reason: string;
}

interface PreviousRejectionReport {
  id: string;
  rejectedPassages: RejectedPassage[];
}

function buildServiceClient(): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } }) as AnyClient;
}

function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

async function checkPerUserThrottle(supabase: AnyClient, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - SUBMIT_THROTTLE_WINDOW_SECS * 1000).toISOString();
  const cleanupCutoff = new Date(Date.now() - SUBMIT_CLEANUP_SECS * 1000).toISOString();

  await supabase
    .from('ai_rate_limits')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cleanupCutoff);

  const { count } = await supabase
    .from('ai_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'review_submit')
    .gte('created_at', windowStart);

  if ((count ?? 0) >= SUBMIT_THROTTLE_MAX) {
    return false;
  }

  await supabase
    .from('ai_rate_limits')
    .insert({ user_id: userId, action: 'review_submit' });

  return true;
}

async function fetchPreviousRejectionReport(
  supabase: AnyClient,
  biographyId: string
): Promise<PreviousRejectionReport | null> {
  const { data: report } = await supabase
    .from('moderation_reports')
    .select('id, moderator_notes')
    .eq('biography_id', biographyId)
    .eq('status', 'decided')
    .eq('decision', 'request_edit')
    .order('decided_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report?.moderator_notes) return null;

  try {
    const parsed = JSON.parse(report.moderator_notes as string);
    if (Array.isArray(parsed.rejectedPassages) && parsed.rejectedPassages.length > 0) {
      return {
        id: report.id as string,
        rejectedPassages: parsed.rejectedPassages as RejectedPassage[],
      };
    }
  } catch {
  }

  return null;
}

async function fetchBiographyContent(
  supabase: AnyClient,
  biographyId: string,
  targetSectionKeys?: string[]
): Promise<{ text: string; authorId: string; contentLanguage: string }> {
  const { data: bio } = await supabase
    .from('biographies')
    .select('user_id, content_freeflow, content_language')
    .eq('id', biographyId)
    .maybeSingle();

  const authorId: string = (bio as any)?.user_id ?? '';
  const contentLanguage: string = (bio as any)?.content_language ?? 'en';

  let query = supabase
    .from('biography_sections')
    .select('section_key, content')
    .eq('biography_id', biographyId)
    .not('content', 'is', null)
    .order('section_key', { ascending: true });

  if (targetSectionKeys && targetSectionKeys.length > 0) {
    query = query.in('section_key', targetSectionKeys);
  }

  const { data: sections } = await query;

  const parts: string[] = [];

  for (const section of (sections as any[]) ?? []) {
    if (section.content?.trim()) {
      parts.push(`[SECTION: ${section.section_key}]\n${section.content.trim()}`);
    }
  }

  const isTargeted = targetSectionKeys && targetSectionKeys.length > 0;
  const includeFreeflow = !isTargeted || targetSectionKeys?.includes('freeflow');

  if (includeFreeflow && (bio as any)?.content_freeflow?.trim()) {
    parts.push(`[SECTION: freeflow]\n${(bio as any).content_freeflow.trim()}`);
  }

  let text = parts.join('\n\n');
  if (text.length > MAX_CONTENT_CHARS) {
    text = text.slice(0, MAX_CONTENT_CHARS);
  }

  return { text, authorId, contentLanguage };
}

interface ScreeningResult {
  passages: Array<{ text: string; section_key: string; reason: string; severity: number }>;
  overall_severity: number;
  aiError?: boolean;
}

async function runAiScreening(biographyText: string): Promise<ScreeningResult> {
  const errorResult: ScreeningResult = { passages: [], overall_severity: 0, aiError: true };

  if (!INFOMANIAK_TOKEN || !INFOMANIAK_ENDPOINT) {
    console.warn('[review/submit] Infomaniak AI not configured — routing to manual review');
    return errorResult;
  }

  const systemPrompt =
    'You are a content moderator for a biography publishing platform. ' +
    'Respond only with valid JSON. No explanations, no markdown, no code blocks. Only the raw JSON object.';

  const userPrompt =
    'Analyze this biography text for potentially problematic content. ' +
    'Identify passages that:\n' +
    '- Make unverified factual claims about living persons\n' +
    '- Contain potentially defamatory statements\n' +
    '- Include explicit personal details about third parties without apparent consent\n' +
    '- Contain hate speech or discriminatory content\n' +
    '- Make unverified legal or criminal accusations\n\n' +
    'For each problematic passage, include:\n' +
    '- text: the exact sentence (max 400 chars)\n' +
    '- section_key: which section it came from\n' +
    '- reason: brief explanation (max 150 chars)\n' +
    '- severity: 1 (minor), 2 (moderate), or 3 (serious)\n\n' +
    'If no issues are found, return an empty passages array. ' +
    'overall_severity should be the max severity found, or 0.\n\n' +
    'Return ONLY this JSON:\n' +
    '{"passages":[],"overall_severity":0}\n\n' +
    'Biography:\n' +
    biographyText;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const res = await fetch(INFOMANIAK_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${INFOMANIAK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: INFOMANIAK_MODEL,
        max_tokens: 2048,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      console.error('[review/submit] AI HTTP error:', res.status);
      return errorResult;
    }

    const aiJson = await res.json();
    const rawText: string = aiJson?.choices?.[0]?.message?.content ?? '';

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[review/submit] Could not extract JSON from AI response. Raw text:', rawText);
      return errorResult;
    }

    try {
      const parsed = JSON.parse(match[0]);
      return {
        passages: Array.isArray(parsed.passages) ? parsed.passages : [],
        overall_severity: typeof parsed.overall_severity === 'number' ? parsed.overall_severity : 0,
      };
    } catch (parseErr) {
      console.error('[review/submit] JSON.parse failed. Raw AI text:', rawText, 'Error:', parseErr);
      return errorResult;
    }
  } catch (err) {
    console.error('[review/submit] AI screening error:', err);
    return errorResult;
  }
}

async function pickReviewer(supabase: AnyClient): Promise<string | null> {
  const { data: candidates } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['reviewer', 'admin']);

  if (!candidates || (candidates as any[]).length === 0) return null;

  const activeStatuses = ['unassigned', 'assigned', 'in_review'];

  const loads = await Promise.all(
    (candidates as any[]).map(async (c: { id: string }) => {
      const { count } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', c.id)
        .in('status', activeStatuses);

      const { data: lastAssignment } = await supabase
        .from('moderation_reports')
        .select('assigned_at')
        .eq('assigned_to', c.id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: c.id,
        load: count ?? 0,
        lastAssignedAt: (lastAssignment as any)?.assigned_at ?? '1970-01-01T00:00:00Z',
      };
    })
  );

  loads.sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load;
    return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
  });

  return loads[0].id;
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
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

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

    if (!await checkPerUserThrottle(serviceClient, callerId)) {
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

    const previousRejection = await fetchPreviousRejectionReport(serviceClient, biographyId);
    const isRescreen = previousRejection !== null;

    const targetSectionKeys = isRescreen
      ? previousRejection.rejectedPassages.map((p) => p.section_key)
      : undefined;

    const { text, authorId, contentLanguage } = await fetchBiographyContent(
      serviceClient,
      biographyId,
      targetSectionKeys
    );

    if (!authorId) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }

    const screening = await runAiScreening(text);

    if (screening.aiError) {
      await serviceClient
        .from('biographies')
        .update({
          status: 'under_review',
          ai_screening_status: 'ai_error',
        })
        .eq('id', biographyId);

      const { data: errorReport } = await serviceClient
        .from('moderation_reports')
        .insert({
          biography_id: biographyId,
          reporter_id: null,
          report_type: 'level2_content',
          description: 'AI screening failed — routed to manual review',
          status: 'unassigned',
          ai_analysis: {
            summary: 'AI screening could not complete. Manual review required.',
            flagged_passages: [],
          },
          ai_violation_level: 0,
        })
        .select('id')
        .maybeSingle();

      const errorReviewerId = await pickReviewer(serviceClient);

      if (errorReviewerId && (errorReport as any)?.id) {
        await serviceClient
          .from('moderation_reports')
          .update({
            status: 'assigned',
            assigned_to: errorReviewerId,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', (errorReport as any).id);

        const assignMsg =
          REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
        await serviceClient
          .from('user_notifications')
          .insert({ user_id: errorReviewerId, message: assignMsg });
      }

      return NextResponse.json({ result: 'under_review', message: 'submitted for manual review', isRescreen });
    }

    if (screening.passages.length === 0) {
      await serviceClient
        .from('biographies')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          ai_screening_status: 'passed',
        })
        .eq('id', biographyId);

      if (isRescreen && previousRejection.id) {
        await serviceClient
          .from('moderation_reports')
          .update({
            status: 'decided',
            decision: 'publish',
            decided_at: new Date().toISOString(),
          })
          .eq('id', previousRejection.id);
      }

      const autoMsg =
        AUTO_PUBLISHED_MESSAGES[contentLanguage] ?? AUTO_PUBLISHED_MESSAGES['en'];
      await serviceClient
        .from('user_notifications')
        .insert({ user_id: authorId, message: autoMsg });

      return NextResponse.json({ result: 'published', screeningStatus: 'passed', isRescreen });
    }

    const flaggedPassages = screening.passages.map((p) => ({
      text: p.text,
      section_key: p.section_key,
      reason: p.reason,
      level: p.severity,
    }));

    await serviceClient
      .from('biographies')
      .update({ ai_screening_status: 'flagged' })
      .eq('id', biographyId);

    if (isRescreen && previousRejection.id) {
      await serviceClient
        .from('moderation_reports')
        .update({
          status: 'decided',
          decision: 'no_action',
          decided_at: new Date().toISOString(),
        })
        .eq('id', previousRejection.id);
    }

    const { data: newReport } = await serviceClient
      .from('moderation_reports')
      .insert({
        biography_id: biographyId,
        reporter_id: null,
        report_type: 'level2_content',
        description: isRescreen
          ? 'Automated AI re-screening of revised sections'
          : 'Automated AI content screening',
        status: 'unassigned',
        ai_analysis: {
          summary: `${flaggedPassages.length} passage(s) flagged by AI screening`,
          flagged_passages: flaggedPassages,
        },
        ai_violation_level: screening.overall_severity,
      })
      .select('id')
      .maybeSingle();

    const reviewerId = await pickReviewer(serviceClient);

    if (reviewerId && (newReport as any)?.id) {
      await serviceClient
        .from('moderation_reports')
        .update({
          status: 'assigned',
          assigned_to: reviewerId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', (newReport as any).id);

      const assignMsg =
        REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
      await serviceClient
        .from('user_notifications')
        .insert({ user_id: reviewerId, message: assignMsg });
    }

    return NextResponse.json({ result: 'under_review', flagCount: flaggedPassages.length, isRescreen });
  } catch (err) {
    console.error('[review/submit] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
