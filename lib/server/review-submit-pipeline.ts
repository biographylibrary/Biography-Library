import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';
import { runPublicationScreening } from '@/lib/agents/screening/run-publication-screening';
import { chat } from '@/lib/agents/infomaniak-client';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import {
  notifyAuthorPublicationEmail,
  notifyReviewerAssignedEmail,
} from '@/lib/server/email/publication-helpers';
import { resolveRecordLanguageTag } from '@/lib/record-language';
import {
  checkPublishGate,
  computePublicFingerprint,
  gatedPublish,
  recordScreening,
  type ScreeningVerdict,
} from '@/lib/server/publication-fingerprint';


const MAX_CONTENT_CHARS = 6000;
const AI_TIMEOUT_MS = 30_000;

const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

export const SUBMIT_THROTTLE_WINDOW_SECS = 60;
export const SUBMIT_THROTTLE_MAX = 3;

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

export { buildServiceClient, type AnyClient } from '@/lib/server/service-client';
import type { AnyClient } from '@/lib/server/service-client';

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
 * `flagged_passages`: a new screening closes that report (the new one replaces it).
 * The screening itself always reads the whole text, not only those sections.
 */
async function fetchOpenAiFlaggedReportForRescreen(
  supabase: AnyClient,
  biographyId: string
): Promise<{ id: string } | null> {
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

  return { id: report.id as string };
}

/**
 * Il testo che lo screening legge: `final_version` se c'è, altrimenti le sezioni e il
 * flusso libero. Sempre il testo intero: lo screening non esamina più sezioni mirate,
 * perché una garanzia sul testo pubblicato non può poggiare su una parte sola.
 * `text` è ciò che riceve il modello (al massimo MAX_CONTENT_CHARS); `sourceChars`
 * è la lunghezza del testo di partenza: se è maggiore, il modello non l'ha visto tutto.
 */
export async function fetchBiographyContent(
  supabase: AnyClient,
  biographyId: string
): Promise<{ text: string; authorId: string; contentLanguage: string; sourceChars: number }> {
  const { data: bio } = await supabase
    .from('biographies')
    .select(
      'user_id, content, content_freeflow, content_language, record_language_tag, final_version, biography_mode'
    )
    .eq('id', biographyId)
    .maybeSingle();

  const authorId: string = (bio as any)?.user_id ?? '';
  const contentLanguage: string = resolveRecordLanguageTag(bio as any);

  const finalRaw = (bio as any)?.final_version?.trim();
  if (finalRaw) {
    return { ...cutForModel(storedToArchiveMarkdown(finalRaw)), authorId, contentLanguage };
  }

  const jsonContent =
    ((bio as { content?: Record<string, { text?: string } | undefined> | null }).content ??
      {}) as Record<string, { text?: string } | undefined>;

  const parts: string[] = [];

  for (const { key } of BIOGRAPHY_SECTIONS) {
    const fromJson = jsonContent[key]?.text?.trim();
    if (fromJson) {
      parts.push(`[SECTION: ${key}]\n${storedToArchiveMarkdown(fromJson)}`);
    }
  }

  if (parts.length === 0) {
    const { data: sections } = await supabase
      .from('biography_sections')
      .select('section_key, content')
      .eq('biography_id', biographyId)
      .not('content', 'is', null)
      .order('section_key', { ascending: true });

    for (const section of (sections as any[]) ?? []) {
      if (section.content?.trim()) {
        parts.push(
          `[SECTION: ${section.section_key}]\n${storedToArchiveMarkdown(section.content.trim())}`
        );
      }
    }
  }

  if ((bio as any)?.content_freeflow?.trim()) {
    parts.push(
      `[SECTION: freeflow]\n${storedToArchiveMarkdown((bio as any).content_freeflow.trim())}`
    );
  }

  return { ...cutForModel(parts.join('\n\n')), authorId, contentLanguage };
}

function cutForModel(full: string): { text: string; sourceChars: number } {
  return { text: full.length > MAX_CONTENT_CHARS ? full.slice(0, MAX_CONTENT_CHARS) : full, sourceChars: full.length };
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
  contentLanguage: string = 'en',
  usageOwner: { userId?: string | null; biographyId?: string | null } = {}
): Promise<DraftAiFeedback> {
  const errorResult: DraftAiFeedback = {
    overall_quality: 0,
    strengths: [],
    suggestions: [],
    red_flags: [],
    ready_for_publication: false,
    aiError: true,
  };

  if (!process.env.INFOMANIAK_AI_TOKEN || !process.env.INFOMANIAK_AI_ENDPOINT) {
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
    const result = await chat({
      role: 'reviewer',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
      timeoutMs: AI_TIMEOUT_MS,
      // Solo il modello primario del revisore, come prima: nessun ripiego nascosto.
      allowFallback: false,
      usage: { purpose: 'preprint_check', ...usageOwner },
    });

    const rawText: string = result.content ?? '';
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
    const { generateAndStorePermanenceTextExports } = await import(
      '@/lib/server/permanence-stored-exports'
    );
    await generateAndStorePermanenceTextExports(supabase, biographyId);
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
      screeningDetail?: 'parse_error' | 'ai_error' | 'flagged' | 'text_changed' | 'too_long';
      flagCount?: number;
    };

interface ManualReviewArgs {
  serviceClient: AnyClient;
  biographyId: string;
  authorId: string;
  contentLanguage: string;
  priorStatus: string | null;
  previousReviewerId: string | null;
  isRescreen: boolean;
  aiScreeningStatus: 'parse_error' | 'ai_error' | 'pending';
  reportDescription: string;
  reportSummary: string;
  screeningDetail: 'parse_error' | 'ai_error' | 'text_changed' | 'too_long';
  message: string;
  /** Solo per "testo cambiato": lascia nel registro il fatto che l'impronta esaminata non è più quella attuale. */
  recordTextChanged?: { fingerprint: string; examinedChars: number; sourceChars: number };
}

/**
 * La scheda non si pubblica da sola: passa alla revisione umana (errore del
 * modello, risposta illeggibile, oppure testo cambiato durante lo screening).
 */
async function routeToManualReview(args: ManualReviewArgs): Promise<ReviewSubmitPipelineResult> {
  const { serviceClient, biographyId, authorId, contentLanguage } = args;

  if (args.recordTextChanged) {
    await recordScreening(serviceClient, {
      biographyId,
      fingerprint: args.recordTextChanged.fingerprint,
      verdict: 'text_changed',
      scope: 'full',
      examinedChars: args.recordTextChanged.examinedChars,
      sourceChars: args.recordTextChanged.sourceChars,
    });
  }

  const patch: Record<string, unknown> = { ai_screening_status: args.aiScreeningStatus };
  if (args.priorStatus === 'locked_pending_screening') {
    patch.status = 'under_review';
  }
  await serviceClient.from('biographies').update(patch).eq('id', biographyId);

  const { data: errorReport } = await serviceClient
    .from('moderation_reports')
    .insert({
      biography_id: biographyId,
      reporter_id: null,
      report_type: 'level2_content',
      origin: 'screening',
      description: args.reportDescription,
      status: 'unassigned',
      ai_analysis: {
        summary: args.reportSummary,
        flagged_passages: [],
      },
      ai_violation_level: 0,
    })
    .select('id')
    .maybeSingle();

  const errorReviewerId = await pickReviewer(serviceClient, contentLanguage, args.previousReviewerId);

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
    message: args.message,
    isRescreen: args.isRescreen,
    screeningDetail: args.screeningDetail,
  };
}

interface ScreeningPass {
  authorId: string;
  contentLanguage: string;
  /** Ciò che ha ricevuto il modello. */
  text: string;
  /** Lunghezza del testo di partenza: maggiore di text.length se il modello non l'ha visto tutto. */
  sourceChars: number;
  /** Impronta del testo pubblico nel momento in cui lo screening lo legge. */
  fingerprint: string;
  screening: Awaited<ReturnType<typeof runPublicationScreening>>;
  verdict: ScreeningVerdict;
}

/**
 * Un esame: impronta del testo pubblico, lettura del testo, modello, traccia nel
 * registro. Non cambia lo stato della scheda. Esame sempre del testo intero.
 */
async function runScreeningPass(serviceClient: AnyClient, biographyId: string): Promise<ScreeningPass> {
  const fingerprint = await computePublicFingerprint(serviceClient, biographyId);
  const { text, authorId, contentLanguage, sourceChars } = await fetchBiographyContent(
    serviceClient,
    biographyId
  );
  if (!authorId || !fingerprint) {
    throw new Error('Biography not found');
  }

  const screening = await runPublicationScreening(text, undefined, { userId: authorId, biographyId });

  const verdict: ScreeningVerdict = screening.aiError
    ? screening.parseError
      ? 'parse_error'
      : 'ai_error'
    : screening.passages.length === 0
      ? 'passed'
      : 'flagged';

  await recordScreening(serviceClient, {
    biographyId,
    fingerprint,
    verdict,
    scope: 'full',
    examinedChars: text.length,
    sourceChars,
  });

  return { authorId, contentLanguage, text, sourceChars, fingerprint, screening, verdict };
}

export interface ReviewScreeningOutcome {
  verdict: ScreeningVerdict;
  fingerprint: string;
  examinedChars: number;
  sourceChars: number;
  /** Vero se il modello non ha visto tutto il testo: la persona deve leggerlo per intero. */
  partial: boolean;
  overallSeverity: number;
  flaggedPassages: Array<{ text: string; section_key: string | null; reason: string; level: number }>;
}

/**
 * Screening senza pubblicazione: per una correzione inviata dopo una revisione
 * richiesta. Registra l'esame (impronta e esito) e restituisce l'esito da allegare
 * alla scheda; la decisione resta al revisore, e `gatedPublish` pubblicherà solo se
 * l'impronta del testo coincide con quella registrata qui.
 */
export async function runScreeningForReview(
  serviceClient: AnyClient,
  biographyId: string
): Promise<ReviewScreeningOutcome> {
  const pass = await runScreeningPass(serviceClient, biographyId);
  return {
    verdict: pass.verdict,
    fingerprint: pass.fingerprint,
    examinedChars: pass.text.length,
    sourceChars: pass.sourceChars,
    partial: pass.text.length < pass.sourceChars,
    overallSeverity: pass.screening.overall_severity ?? 0,
    flaggedPassages: pass.screening.passages.map((p) => ({
      text: p.text,
      section_key: p.section_key ?? null,
      reason: p.reason,
      level: p.severity,
    })),
  };
}

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

  // Un nuovo screening chiude il rapporto precedente (vale per il testo intero).
  const previousReportId: string | null = moderatorRejection?.id ?? aiRescreen?.id ?? null;
  const isRescreen = previousReportId !== null;

  let previousReviewerId: string | null = null;
  if (previousReportId) {
    const { data: prevReport } = await serviceClient
      .from('moderation_reports')
      .select('assigned_to')
      .eq('id', previousReportId)
      .maybeSingle();
    previousReviewerId = (prevReport as { assigned_to?: string } | null)?.assigned_to ?? null;
  }

  const {
    authorId,
    contentLanguage,
    text,
    sourceChars,
    fingerprint: examinedFingerprint,
    screening,
  } = await runScreeningPass(serviceClient, biographyId);

  const priorStatus = await fetchBiographyStatus(serviceClient, biographyId);

  if (screening.aiError) {
    return routeToManualReview({
      serviceClient,
      biographyId,
      authorId,
      contentLanguage,
      priorStatus,
      previousReviewerId,
      isRescreen,
      aiScreeningStatus: screening.parseError ? 'parse_error' : 'ai_error',
      reportDescription: 'AI screening failed — routed to manual review',
      reportSummary: 'AI screening could not complete. Manual review required.',
      screeningDetail: screening.parseError ? 'parse_error' : 'ai_error',
      message: 'submitted for manual review',
    });
  }

  if (screening.passages.length === 0) {
    const textChanged = (message: string) =>
      routeToManualReview({
        serviceClient,
        biographyId,
        authorId,
        contentLanguage,
        priorStatus,
        previousReviewerId,
        isRescreen,
        aiScreeningStatus: 'pending',
        reportDescription: 'Text changed during screening — routed to manual review',
        reportSummary: message,
        screeningDetail: 'text_changed',
        message: 'text_changed_during_screening',
        recordTextChanged: { fingerprint: examinedFingerprint, examinedChars: text.length, sourceChars },
      });

    // Regola provvisoria (fino allo screening a pezzi): se il modello non ha visto tutto il
    // testo non si pubblica da soli. Nessun testo va online in automatico senza essere
    // stato letto per intero dal modello; la scheda passa alla coda umana con il motivo scritto.
    if (text.length < sourceChars) {
      return routeToManualReview({
        serviceClient,
        biographyId,
        authorId,
        contentLanguage,
        priorStatus,
        previousReviewerId,
        isRescreen,
        aiScreeningStatus: 'pending',
        reportDescription: 'Text longer than the screening window — routed to manual review',
        reportSummary: `The screening model read ${text.length} of ${sourceChars} characters of this text, so it cannot publish it automatically. A person must read the whole text.`,
        screeningDetail: 'too_long',
        message: 'text_longer_than_screening_window',
      });
    }

    // Prima dell'identificativo UM (permanente): se il testo è cambiato, niente UM.
    const precheck = await checkPublishGate(serviceClient, {
      biographyId,
      mode: 'auto',
      expectedFingerprint: examinedFingerprint,
    });
    if (!precheck.ok) return textChanged(precheck.message);

    const { ensureUmIdFor } = await import('@/lib/server/um-id-registry');
    await ensureUmIdFor(serviceClient, biographyId);

    const { data: priorBio } = await serviceClient
      .from('biographies')
      .select('biography_type, published_at, provisional_until')
      .eq('id', biographyId)
      .maybeSingle();
    const prior = priorBio as {
      biography_type?: string | null;
      published_at?: string | null;
      provisional_until?: string | null;
    } | null;
    const publishedAt = prior?.published_at ?? new Date().toISOString();
    const publishPatch: Record<string, string> = {
      status: 'published',
      ai_screening_status: 'passed',
    };
    if (!prior?.published_at) publishPatch.published_at = publishedAt;
    if (prior?.biography_type === 'memorial' && !prior.provisional_until && !prior.published_at) {
      const { provisionalUntilOnFirstPublish } = await import('@/lib/provisional-window');
      const until = provisionalUntilOnFirstPublish('memorial', publishedAt);
      if (until) publishPatch.provisional_until = until;
    }

    const published = await gatedPublish(
      serviceClient,
      { biographyId, mode: 'auto', actorId: null, expectedFingerprint: examinedFingerprint },
      async () => {
        const { error: publishError } = await serviceClient
          .from('biographies')
          .update(publishPatch)
          .eq('id', biographyId);
        return publishError ? publishError.message : null;
      }
    );
    if (!published.ok && published.blocked) return textChanged(published.message);
    if (!published.ok) {
      // Pubblicazione non riuscita (per esempio attesa fra capitoli): niente notifiche,
      // niente cancellazione della memoria di Echo, niente risposta "pubblicata".
      console.error('[review-submit-pipeline] publish update failed:', published.error);
      throw new Error(`publish_failed: ${published.error}`);
    }

    try {
      const { syncArchivePackage } = await import('@/lib/server/archive-package-store');
      await syncArchivePackage(serviceClient, biographyId, 'publication');
    } catch (err) {
      console.error('[review-submit-pipeline] archive package failed (non-blocking):', err);
    }

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
      origin: 'screening',
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
