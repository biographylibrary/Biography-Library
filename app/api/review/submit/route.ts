import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const INFOMANIAK_ENDPOINT = process.env.INFOMANIAK_AI_ENDPOINT ?? '';
const INFOMANIAK_TOKEN = process.env.INFOMANIAK_AI_TOKEN ?? '';
const INFOMANIAK_MODEL = process.env.INFOMANIAK_AI_MODEL ?? 'mistral3';

const MAX_CONTENT_CHARS = 6000;
const AI_TIMEOUT_MS = 30_000;

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

function buildServiceClient(): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } }) as AnyClient;
}

async function fetchBiographyContent(
  supabase: AnyClient,
  biographyId: string
): Promise<{ text: string; authorId: string; contentLanguage: string }> {
  const { data: bio } = await supabase
    .from('biographies')
    .select('user_id, freeflow_content, content_language')
    .eq('id', biographyId)
    .maybeSingle();

  const authorId: string = (bio as any)?.user_id ?? '';
  const contentLanguage: string = (bio as any)?.content_language ?? 'en';

  const { data: sections } = await supabase
    .from('biography_sections')
    .select('section_key, content')
    .eq('biography_id', biographyId)
    .not('content', 'is', null)
    .order('section_key', { ascending: true });

  const parts: string[] = [];

  for (const section of (sections as any[]) ?? []) {
    if (section.content?.trim()) {
      parts.push(`[SECTION: ${section.section_key}]\n${section.content.trim()}`);
    }
  }

  if ((bio as any)?.freeflow_content?.trim()) {
    parts.push(`[SECTION: freeflow]\n${(bio as any).freeflow_content.trim()}`);
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
}

async function runAiScreening(biographyText: string): Promise<ScreeningResult> {
  const fallback: ScreeningResult = { passages: [], overall_severity: 0 };

  if (!INFOMANIAK_TOKEN || !INFOMANIAK_ENDPOINT) {
    console.warn('[review/submit] Infomaniak AI not configured — skipping screening');
    return fallback;
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
      return fallback;
    }

    const aiJson = await res.json();
    const rawText: string = aiJson?.choices?.[0]?.message?.content ?? '';

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[review/submit] Could not extract JSON from AI response');
      return fallback;
    }

    const parsed = JSON.parse(match[0]);
    return {
      passages: Array.isArray(parsed.passages) ? parsed.passages : [],
      overall_severity: typeof parsed.overall_severity === 'number' ? parsed.overall_severity : 0,
    };
  } catch (err) {
    console.error('[review/submit] AI screening error:', err);
    return fallback;
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
  try {
    const body = await req.json();
    const { biographyId } = body as { biographyId?: string };

    if (!biographyId) {
      return NextResponse.json({ error: 'biographyId is required' }, { status: 400 });
    }

    const supabase = buildServiceClient();

    const { text, authorId, contentLanguage } = await fetchBiographyContent(supabase, biographyId);

    if (!authorId) {
      return NextResponse.json({ error: 'Biography not found' }, { status: 404 });
    }

    const screening = await runAiScreening(text);

    if (screening.passages.length === 0) {
      await supabase
        .from('biographies')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', biographyId);

      const autoMsg =
        AUTO_PUBLISHED_MESSAGES[contentLanguage] ?? AUTO_PUBLISHED_MESSAGES['en'];
      await supabase
        .from('user_notifications')
        .insert({ user_id: authorId, message: autoMsg });

      return NextResponse.json({ result: 'published' });
    }

    const flaggedPassages = screening.passages.map((p) => ({
      text: p.text,
      reason: p.reason,
      level: p.severity,
    }));

    const { data: newReport } = await supabase
      .from('moderation_reports')
      .insert({
        biography_id: biographyId,
        reporter_id: null,
        report_type: 'level2_content',
        description: 'Automated AI content screening',
        status: 'unassigned',
        ai_analysis: {
          summary: `${flaggedPassages.length} passage(s) flagged by AI screening`,
          flagged_passages: flaggedPassages,
        },
        ai_violation_level: screening.overall_severity,
      })
      .select('id')
      .maybeSingle();

    const reviewerId = await pickReviewer(supabase);

    if (reviewerId && (newReport as any)?.id) {
      await supabase
        .from('moderation_reports')
        .update({
          status: 'assigned',
          assigned_to: reviewerId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', (newReport as any).id);

      const assignMsg =
        REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
      await supabase
        .from('user_notifications')
        .insert({ user_id: reviewerId, message: assignMsg });
    }

    return NextResponse.json({ result: 'under_review', flagCount: flaggedPassages.length });
  } catch (err) {
    console.error('[review/submit] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
