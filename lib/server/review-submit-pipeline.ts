import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';
import { runPublicationScreening } from '@/lib/agents/screening/run-publication-screening';
import { getModelForRole } from '@/lib/agents/models';
import { stripHtml } from '@/lib/pdf-export';
import {
  notifyAuthorPublicationEmail,
  notifyReviewerAssignedEmail,
} from '@/lib/server/email/publication-helpers';

const INFOMANIAK_ENDPOINT = process.env.INFOMANIAK_AI_ENDPOINT ?? '';
const INFOMANIAK_TOKEN = process.env.INFOMANIAK_AI_TOKEN ?? '';

const MAX_CONTENT_CHARS = 6000;
const AI_TIMEOUT_MS = 30_000;

const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

export const SUBMIT_THROTTLE_WINDOW_SECS = 60;
export const SUBMIT_THROTTLE_MAX = 3;

const FINAL_VERSION_EXPORT_STATUSES = new Set([
  'final_version',
  'published',
  'pdf_draft',
  'locked_pending_screening',
  'under_review',
]);

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

const UNDER_REVIEW_MESSAGES: Record<string, string> = {
  en: 'Your biography has been submitted for human review.',
  it: 'La tua biografia è stata inviata a revisione umana.',
  fr: 'Votre biographie a été soumise à une révision humaine.',
  de: 'Ihre Biografie wurde zur manuellen Prüfung eingereicht.',
};

export type AnyClient = SupabaseClient<any, any, any>;

export function buildServiceClient(): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } }) as AnyClient;
}

export async function checkPerUserThrottle(supabase: AnyClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_and_record_submit_attempt', {
    p_user_id: userId,
    p_window_secs: SUBMIT_THROTTLE_WINDOW_SECS,
    p_max_attempts: SUBMIT_THROTTLE_MAX,
  });
  if (error) {
    console.error('[review-submit-pipeline] Throttle RPC error:', error);
    return true;
  }
  return data === true;
}

interface RejectedPassage {
  section_key: string;
  ai_reason: string;
}

interface PreviousRejectionReport {
  id: string;
  rejectedPassages: RejectedPassage[];
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

  const notes = report.moderator_notes as { rejectedPassages?: RejectedPassage[] };
  if (Array.isArray(notes.rejectedPassages) && notes.rejectedPassages.length > 0) {
    return {
      id: report.id as string,
      rejectedPassages: notes.rejectedPassages,
    };
  }

  return null;
}

/**
 * When status is `under_review` after AI flags, the latest open report carries
 * `flagged_passages`; re-screen only those sections (same as moderator rescreen).
 */
async function fetchOpenAiFlaggedReportForRescreen(
  supabase: AnyClient,
  biographyId: string
): Promise<{ id: string; sectionKeys: string[] } | null> {
  const { data: bio } = await supabase
    .from('biographies')
    .select('status')
    .eq('id', biographyId)
    .maybeSingle();

  if ((bio as { status?: string } | null)?.status !== 'under_review') {
    return null;
  }

  const { data: report } = await supabase
    .from('moderation_reports')
    .select('id, ai_analysis')
    .eq('biography_id', biographyId)
    .in('status', ['unassigned', 'assigned'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const raw = (report?.ai_analysis as { flagged_passages?: unknown } | null)?.flagged_passages;
  if (!Array.isArray(raw) || raw.length === 0 || !report?.id) {
    return null;
  }

  const keys = Array.from(
    new Set(
      raw
        .map((p: { section_key?: string }) => p.section_key)
        .filter((k): k is string => typeof k === 'string' && k.length > 0)
    )
  );

  if (keys.length === 0) {
    return null;
  }

  return { id: report.id as string, sectionKeys: keys };
}

export async function fetchBiographyContent(
  supabase: AnyClient,
  biographyId: string,
  targetSectionKeys?: string[]
): Promise<{ text: string; authorId: string; contentLanguage: string }> {
  const { data: bio } = await supabase
    .from('biographies')
    .select('user_id, content_freeflow, content_language, final_version')
    .eq('id', biographyId)
    .maybeSingle();

  const authorId: string = (bio as any)?.user_id ?? '';
  const contentLanguage: string = (bio as any)?.content_language ?? 'en';

  const hasTargetKeys = targetSectionKeys && targetSectionKeys.length > 0;
  const finalRaw = (bio as any)?.final_version?.trim();
  if (!hasTargetKeys && finalRaw) {
    let text = stripHtml(finalRaw);
    if (text.length > MAX_CONTENT_CHARS) {
      text = text.slice(0, MAX_CONTENT_CHARS);
    }
    return { text, authorId, contentLanguage };
  }

  /** Used below when targeted sections are empty but final_version holds the live text (PDF path). */
  const finalVersionFallback = (): { text: string; authorId: string; contentLanguage: string } => {
    let text = stripHtml(finalRaw ?? '');
    if (text.length > MAX_CONTENT_CHARS) {
      text = text.slice(0, MAX_CONTENT_CHARS);
    }
    return { text, authorId, contentLanguage };
  };

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

  if (hasTargetKeys && !text.trim() && finalRaw) {
    return finalVersionFallback();
  }

  return { text, authorId, contentLanguage };
}

export interface DraftAiSuggestion {
  type: 'narrative' | 'completeness' | 'clarity' | 'style';
  section_key: string | null;
  text: string;
}

export interface DraftAiRedFlag {
  section_key: string | null;
  issue: string;
  severity: 1 | 2 | 3;
}

export interface DraftAiFeedback {
  overall_quality: number;
  strengths: string[];
  suggestions: DraftAiSuggestion[];
  red_flags: DraftAiRedFlag[];
  ready_for_publication: boolean;
  aiError?: boolean;
}

function normalizeDraftFeedback(input: unknown): DraftAiFeedback {
  if (!input || typeof input !== 'object') {
    return {
      overall_quality: 0,
      strengths: [],
      suggestions: [],
      red_flags: [],
      ready_for_publication: false,
      aiError: true,
    };
  }

  const obj = input as Record<string, unknown>;
  const quality =
    typeof obj.overall_quality === 'number' && Number.isFinite(obj.overall_quality)
      ? Math.max(0, Math.min(5, Math.round(obj.overall_quality)))
      : 0;
  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths.filter((s): s is string => typeof s === 'string').slice(0, 3)
    : [];
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .map((s): DraftAiSuggestion | null => {
          if (!s || typeof s !== 'object') return null;
          const rec = s as Record<string, unknown>;
          const type = rec.type;
          if (type !== 'narrative' && type !== 'completeness' && type !== 'clarity' && type !== 'style') {
            return null;
          }
          const text = typeof rec.text === 'string' ? rec.text.slice(0, 200) : '';
          if (!text) return null;
          return {
            type,
            section_key: typeof rec.section_key === 'string' ? rec.section_key : null,
            text,
          };
        })
        .filter((s): s is DraftAiSuggestion => s !== null)
    : [];
  const redFlags = Array.isArray(obj.red_flags)
    ? obj.red_flags
        .map((r): DraftAiRedFlag | null => {
          if (!r || typeof r !== 'object') return null;
          const rec = r as Record<string, unknown>;
          const sev = rec.severity;
          const issue = typeof rec.issue === 'string' ? rec.issue : '';
          if (!issue || (sev !== 1 && sev !== 2 && sev !== 3)) return null;
          return {
            section_key: typeof rec.section_key === 'string' ? rec.section_key : null,
            issue,
            severity: sev,
          };
        })
        .filter((r): r is DraftAiRedFlag => r !== null)
    : [];

  return {
    overall_quality: quality,
    strengths,
    suggestions,
    red_flags: redFlags,
    ready_for_publication: obj.ready_for_publication === true,
  };
}

const DRAFT_LANG_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  de: 'German',
  fr: 'French',
};

function draftReviewFocusBlock(iteration: number): string {
  if (iteration <= 1) {
    return (
      'This is the FIRST draft review. Focus exclusively on:\n' +
      '- Narrative flow: does the story move naturally from beginning to end?\n' +
      '- Completeness: are key life moments (childhood, family, work, turning points) present or clearly missing?\n' +
      '- Emotional authenticity: does the voice feel genuine, not generic?\n' +
      'Do NOT flag minor style or grammar issues at this stage.\n' +
      'Flag as red_flag severity 3 ONLY content that is clearly defamatory or contains explicit personal data about a named living third party.'
    );
  }
  if (iteration === 2) {
    return (
      'This is the SECOND draft review. The narrative structure is already set. Focus on:\n' +
      '- Clarity: are there sentences or paragraphs that are confusing or ambiguous?\n' +
      '- Repetition: identify passages that repeat the same information unnecessarily\n' +
      '- Pacing: flag sections that feel rushed (too short for their importance) or overlong (too detailed for their relevance)\n' +
      'Do NOT re-evaluate narrative completeness already addressed in draft 1.\n' +
      'Flag as red_flag severity 3 ONLY content that is clearly defamatory or makes unverified legal/criminal accusations about a named living person.'
    );
  }
  return (
    `This is draft review #${iteration} before publication. Focus on:\n` +
    '- Final polish: anything that would embarrass the author if published as-is\n' +
    '- Legal sensitivity: statements about living persons that could constitute defamation, privacy violations, or unverified criminal accusations — flag these as severity 3 (they will BLOCK publication and trigger human review)\n' +
    '- AI training risk: if the text explicitly asks to be used for AI training, flag severity 3\n' +
    'Be thorough. A missed severity-3 issue here goes to human moderators.'
  );
}

export async function runDraftAiReview(
  biographyText: string,
  iteration: number,
  contentLanguage: string = 'en'
): Promise<DraftAiFeedback> {
  const errorResult: DraftAiFeedback = {
    overall_quality: 0,
    strengths: [],
    suggestions: [],
    red_flags: [],
    ready_for_publication: false,
    aiError: true,
  };

  if (!INFOMANIAK_TOKEN || !INFOMANIAK_ENDPOINT) {
    console.warn('[review-submit-pipeline] Infomaniak AI not configured — draft review fallback');
    return errorResult;
  }

  const langCode = (contentLanguage || 'en').toLowerCase().split(/[-_]/)[0];
  const langName = DRAFT_LANG_NAMES[langCode] ?? 'English';

  const systemPrompt =
    'You are a biography editor reviewing a personal life story for publication. ' +
    'Your role is to give constructive, encouraging feedback. The author may be elderly or not a professional writer. ' +
    `Write every user-visible string in the JSON (strengths, suggestions[].text, red_flags[].issue) in ${langName}. ` +
    'Be kind but honest. Respond only with valid JSON.';
  const jsonShapeBlock =
    'Return ONLY this JSON shape (no markdown, no explanations):\n' +
    '{\n' +
    '  "overall_quality": 1-5,\n' +
    '  "strengths": ["max 3 short strings"],\n' +
    '  "suggestions": [\n' +
    '    {\n' +
    '      "type": "narrative" | "completeness" | "clarity" | "style",\n' +
    '      "section_key": "string or null",\n' +
    '      "text": "short actionable suggestion, max 200 chars"\n' +
    '    }\n' +
    '  ],\n' +
    '  "red_flags": [\n' +
    '    {\n' +
    '      "section_key": "string or null",\n' +
    '      "issue": "brief description",\n' +
    '      "severity": 1 | 2 | 3\n' +
    '    }\n' +
    '  ],\n' +
    '  "ready_for_publication": boolean\n' +
    '}\n\n';

  const iterationFocusBlock = draftReviewFocusBlock(iteration);

  const userPrompt =
    jsonShapeBlock +
    `IMPORTANT: All JSON string values shown to the author must be written in ${langName}.\n\n` +
    'Biography:\n' +
    biographyText +
    '\n\n' +
    iterationFocusBlock;

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
        model: getModelForRole('reviewer').primary,
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
      console.error('[review-submit-pipeline] Draft AI HTTP error:', res.status);
      return errorResult;
    }

    const aiJson = await res.json();
    const rawText: string = aiJson?.choices?.[0]?.message?.content ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[review-submit-pipeline] Draft AI response has no JSON object');
      return errorResult;
    }
    const parsed = JSON.parse(match[0]);
    return normalizeDraftFeedback(parsed);
  } catch (err) {
    console.error('[review-submit-pipeline] Draft AI review error:', err);
    return errorResult;
  }
}

async function pickReviewer(
  supabase: AnyClient,
  contentLanguage?: string,
  preferredReviewerId?: string | null
): Promise<string | null> {
  const activeStatuses = ['unassigned', 'assigned', 'in_review'];

  if (preferredReviewerId) {
    const { data: preferred } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', preferredReviewerId)
      .in('role', ['reviewer', 'admin'])
      .maybeSingle();
    if (preferred) return preferredReviewerId;
  }

  let candidates: { id: string }[] | null = null;

  if (contentLanguage) {
    const { data: langRows } = await supabase
      .from('reviewer_languages')
      .select('user_id')
      .eq('language_code', contentLanguage);

    if (langRows && (langRows as any[]).length > 0) {
      const langUserIds = (langRows as any[]).map((r: any) => r.user_id);
      const { data: langReviewers } = await supabase
        .from('profiles')
        .select('id')
        .in('id', langUserIds)
        .in('role', ['reviewer', 'admin']);

      if (langReviewers && (langReviewers as any[]).length > 0) {
        candidates = (langReviewers as any[]).map((r: any) => ({ id: r.id }));
      }
    }
  }

  if (!candidates || candidates.length === 0) {
    const { data: allReviewers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['reviewer', 'admin']);
    candidates = (allReviewers as { id: string }[] | null) ?? [];
  }

  if (!candidates || candidates.length === 0) return null;

  const loads = await Promise.all(
    candidates.map(async (c: { id: string }) => {
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

export async function generateAndStoreExports(supabase: AnyClient, biographyId: string): Promise<void> {
  try {
    const { buildBiographyTxtContent, buildBiographyDocxBuffer } = await import('@/lib/export-server');
    const { data: bio } = await supabase
      .from('biographies')
      .select('title, author_name, created_at, content_freeflow, biography_mode, final_version, status')
      .eq('id', biographyId)
      .maybeSingle();

    if (!bio) return;

    const { data: sectionRows } = await supabase
      .from('biography_sections')
      .select('section_key, content')
      .eq('biography_id', biographyId)
      .not('content', 'is', null)
      .order('section_key', { ascending: true });

    const isFreeFlow = (bio as any).biography_mode === 'freeflow';
    const finalVersion = typeof (bio as any).final_version === 'string' ? (bio as any).final_version : '';
    const shouldUseFinalVersion =
      FINAL_VERSION_EXPORT_STATUSES.has((bio as any).status) && finalVersion.trim().length > 0;

    const sections: Array<{ title: string; content: string }> = isFreeFlow
      ? [
          {
            title: (bio as any).title,
            content: shouldUseFinalVersion ? finalVersion : (bio as any).content_freeflow ?? '',
          },
        ]
      : shouldUseFinalVersion
        ? [{ title: (bio as any).title, content: finalVersion }]
        : ((sectionRows as any[]) ?? [])
            .filter((r: any) => r.content?.trim())
            .map((r: any) => ({ title: r.section_key, content: r.content }));

    const title: string = (bio as any).title ?? '';
    const authorName: string = (bio as any).author_name ?? '';
    const createdAt: string = (bio as any).created_at ?? new Date().toISOString();

    const txtContent = buildBiographyTxtContent(title, authorName, createdAt, sections);
    const txtBytes = Buffer.from(txtContent, 'utf-8');
    const docxBuffer = await buildBiographyDocxBuffer(title, authorName, createdAt, sections);

    const txtPath = `biography-exports/${biographyId}/biography.txt`;
    const docxPath = `biography-exports/${biographyId}/biography.docx`;

    const [txtUpload, docxUpload] = await Promise.all([
      supabase.storage.from('biography-exports').upload(txtPath, txtBytes, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true,
      }),
      supabase.storage.from('biography-exports').upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      }),
    ]);

    if (txtUpload.error) {
      console.error('[review-submit-pipeline] TXT upload error:', txtUpload.error);
    }
    if (docxUpload.error) {
      console.error('[review-submit-pipeline] DOCX upload error:', docxUpload.error);
    }

    const { data: txtUrlData } = supabase.storage.from('biography-exports').getPublicUrl(txtPath);
    const { data: docxUrlData } = supabase.storage.from('biography-exports').getPublicUrl(docxPath);

    await supabase
      .from('biographies')
      .update({
        export_txt_url: txtUrlData?.publicUrl ?? null,
        export_docx_url: docxUrlData?.publicUrl ?? null,
      })
      .eq('id', biographyId);
  } catch (err) {
    console.error('[review-submit-pipeline] Auto-export failed (non-blocking):', err);
  }
}

async function fetchBiographyStatus(supabase: AnyClient, biographyId: string): Promise<string | null> {
  const { data } = await supabase.from('biographies').select('status').eq('id', biographyId).maybeSingle();
  return (data as any)?.status ?? null;
}

export type ReviewSubmitPipelineResult =
  | { result: 'published'; screeningStatus: 'passed'; isRescreen: boolean }
  | {
      result: 'under_review';
      message?: string;
      isRescreen: boolean;
      screeningDetail?: 'parse_error' | 'ai_error' | 'flagged';
      flagCount?: number;
    };

/**
 * Runs AI screening and applies biography / moderation side-effects.
 * Caller is responsible for auth, throttle, and cover checks.
 */
export async function runReviewSubmitScreening(
  serviceClient: AnyClient,
  biographyId: string
): Promise<ReviewSubmitPipelineResult> {
  const moderatorRejection = await fetchPreviousRejectionReport(serviceClient, biographyId);
  const aiRescreen = !moderatorRejection
    ? await fetchOpenAiFlaggedReportForRescreen(serviceClient, biographyId)
    : null;

  let previousReportId: string | null = null;
  let targetSectionKeys: string[] | undefined;

  if (moderatorRejection) {
    previousReportId = moderatorRejection.id;
    targetSectionKeys = moderatorRejection.rejectedPassages.map((p) => p.section_key);
  } else if (aiRescreen) {
    previousReportId = aiRescreen.id;
    targetSectionKeys = aiRescreen.sectionKeys;
  }

  const isRescreen = previousReportId !== null;

  const { text, authorId, contentLanguage } = await fetchBiographyContent(
    serviceClient,
    biographyId,
    targetSectionKeys
  );

  if (!authorId) {
    throw new Error('Biography not found');
  }

  let previousReviewerId: string | null = null;
  if (previousReportId) {
    const { data: prevReport } = await serviceClient
      .from('moderation_reports')
      .select('assigned_to')
      .eq('id', previousReportId)
      .maybeSingle();
    previousReviewerId = (prevReport as { assigned_to?: string } | null)?.assigned_to ?? null;
  }

  const screening = await runPublicationScreening(text, targetSectionKeys);

  const priorStatus = await fetchBiographyStatus(serviceClient, biographyId);

  if (screening.aiError) {
    const patch: Record<string, unknown> = {
      ai_screening_status: screening.parseError ? 'parse_error' : 'ai_error',
    };
    if (priorStatus === 'locked_pending_screening') {
      patch.status = 'under_review';
    }
    await serviceClient.from('biographies').update(patch).eq('id', biographyId);

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

    const errorReviewerId = await pickReviewer(serviceClient, contentLanguage, previousReviewerId);

    if (errorReviewerId && (errorReport as any)?.id) {
      await serviceClient
        .from('moderation_reports')
        .update({
          status: 'assigned',
          assigned_to: errorReviewerId,
          assigned_moderator_id: errorReviewerId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', (errorReport as any).id);

      const assignMsg = REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
      await notifyReviewerAssignedEmail({
        client: serviceClient,
        reviewerId: errorReviewerId,
        biographyId,
        contentLanguage,
        notificationMessage: assignMsg,
      });
    }

    const underReviewMsg = UNDER_REVIEW_MESSAGES[contentLanguage] ?? UNDER_REVIEW_MESSAGES['en'];
    await notifyAuthorPublicationEmail({
      client: serviceClient,
      authorId,
      biographyId,
      templateId: 'publication_under_review',
      contentLanguage,
      notificationMessage: underReviewMsg,
    });

    return {
      result: 'under_review',
      message: 'submitted for manual review',
      isRescreen,
      screeningDetail: screening.parseError ? 'parse_error' : 'ai_error',
    };
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

    if (isRescreen && previousReportId) {
      await serviceClient
        .from('moderation_reports')
        .update({
          status: 'decided',
          decision: 'publish',
          decided_at: new Date().toISOString(),
        })
        .eq('id', previousReportId);
    }

    const autoMsg = AUTO_PUBLISHED_MESSAGES[contentLanguage] ?? AUTO_PUBLISHED_MESSAGES['en'];
    await notifyAuthorPublicationEmail({
      client: serviceClient,
      authorId,
      biographyId,
      templateId: 'publication_auto_published',
      contentLanguage,
      notificationMessage: autoMsg,
    });

    try {
      await purgeAgentMemoryForBiography(serviceClient, biographyId);
    } catch (purgeErr) {
      console.error('[review-submit] purgeAgentMemory failed:', purgeErr);
    }

    return { result: 'published', screeningStatus: 'passed', isRescreen };
  }

  const flaggedPassages = screening.passages.map((p) => ({
    text: p.text,
    section_key: p.section_key,
    reason: p.reason,
    level: p.severity,
  }));

  const flaggedPatch: Record<string, unknown> = { ai_screening_status: 'flagged' };
  if (priorStatus === 'locked_pending_screening') {
    flaggedPatch.status = 'under_review';
  }
  await serviceClient.from('biographies').update(flaggedPatch).eq('id', biographyId);

  if (isRescreen && previousReportId) {
    await serviceClient
      .from('moderation_reports')
      .update({
        status: 'decided',
        decision: 'no_action',
        decided_at: new Date().toISOString(),
      })
      .eq('id', previousReportId);
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

  const reviewerId = await pickReviewer(serviceClient, contentLanguage, previousReviewerId);

  if (reviewerId && (newReport as any)?.id) {
    await serviceClient
      .from('moderation_reports')
      .update({
        status: 'assigned',
        assigned_to: reviewerId,
        assigned_moderator_id: reviewerId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', (newReport as any).id);

    const assignMsg = REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
    await notifyReviewerAssignedEmail({
      client: serviceClient,
      reviewerId,
      biographyId,
      contentLanguage,
      notificationMessage: assignMsg,
    });
  }

  const underReviewMsg = UNDER_REVIEW_MESSAGES[contentLanguage] ?? UNDER_REVIEW_MESSAGES['en'];
  await notifyAuthorPublicationEmail({
    client: serviceClient,
    authorId,
    biographyId,
    templateId: 'publication_under_review',
    contentLanguage,
    notificationMessage: underReviewMsg,
  });

  return {
    result: 'under_review',
    flagCount: flaggedPassages.length,
    isRescreen,
    screeningDetail: 'flagged',
  };
}

export { STAFF_ROLES };
