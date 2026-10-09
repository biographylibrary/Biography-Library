import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';
import { runPublicationScreening } from '@/lib/agents/screening/run-publication-screening';
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
import type {
  PreprintFeedback,
  PreprintRedFlag,
  PreprintSuggestion,
} from '@/lib/server/preprint-check';


const STAFF_ROLES = new Set(['reviewer', 'admin', 'super_admin']);

export const SUBMIT_THROTTLE_WINDOW_SECS = 60;
export const SUBMIT_THROTTLE_MAX = 3;

/** Azioni distinte per `check_and_record_submit_attempt` (non si consumano a vicenda). */
export type SubmitThrottleAction =
  | 'review_submit'
  | 'approve_final_pdf'
  | 'approve_text'
  | 'preprint_check'
  | 'moderation_resubmit'
  | 'record_pdf_draft';

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

export async function checkPerUserThrottle(
  supabase: AnyClient,
  userId: string,
  action: SubmitThrottleAction = 'review_submit'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_and_record_submit_attempt', {
    p_user_id: userId,
    p_window_secs: SUBMIT_THROTTLE_WINDOW_SECS,
    p_max_attempts: SUBMIT_THROTTLE_MAX,
    p_action: action,
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
 * Quando uno screening nuovo sostituisce il precedente, chiude il rapporto aperto
 * più recente (unassigned/assigned): passaggi segnalati, oppure rapporto da errore
 * del lavoro/modello (`origin: screening`, passaggi vuoti). Non dipende da
 * `ai_screening_status` (le rotte lo rimettono a `pending` prima del lavoro).
 * Accetta `under_review` e `locked_pending_screening`. Non tocca altre origini
 * né rapporti già decisi.
 */
export async function fetchOpenAiFlaggedReportForRescreen(
  supabase: AnyClient,
  biographyId: string
): Promise<{ id: string } | null> {
  const { data: bio } = await supabase
    .from('biographies')
    .select('status')
    .eq('id', biographyId)
    .maybeSingle();

  const status = (bio as { status?: string } | null)?.status;
  if (status !== 'under_review' && status !== 'locked_pending_screening') {
    return null;
  }

  const { data: report } = await supabase
    .from('moderation_reports')
    .select('id, origin, ai_analysis')
    .eq('biography_id', biographyId)
    .in('status', ['unassigned', 'assigned'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report?.id) return null;

  const raw = (report.ai_analysis as { flagged_passages?: unknown } | null)?.flagged_passages;
  const hasFlagged = Array.isArray(raw) && raw.length > 0;
  if (hasFlagged) {
    return { id: report.id as string };
  }

  if ((report as { origin?: string }).origin === 'screening') {
    return { id: report.id as string };
  }

  return null;
}

/**
 * Testo che lo screening di pubblicazione legge: tutto il testo pubblico
 * (corpo, titoli/nomi, parti del libro, didascalie, eventi, relazioni).
 * Costruzione unica in `fetchScreeningPublicText` (scope `publication`).
 * `sourceChars` = lunghezza del testo completo così costruito.
 */
export async function fetchBiographyContent(
  supabase: AnyClient,
  biographyId: string
): Promise<{ text: string; authorId: string; contentLanguage: string; sourceChars: number }> {
  const { fetchScreeningPublicText } = await import('@/lib/server/screening-public-text');
  return fetchScreeningPublicText(supabase, biographyId, 'publication');
}

/** @deprecated Alias: il controllo finale è `runPreprintCheck` / `PreprintFeedback`. */
export type DraftAiSuggestion = PreprintSuggestion;
/** @deprecated Alias: il controllo finale è `runPreprintCheck` / `PreprintFeedback`. */
export type DraftAiRedFlag = PreprintRedFlag;
/** @deprecated Alias: il controllo finale è `runPreprintCheck` / `PreprintFeedback`. */
export type DraftAiFeedback = PreprintFeedback;

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
  | { result: 'held_for_original'; screeningStatus: 'passed'; isRescreen: boolean }
  | {
      result: 'under_review';
      message?: string;
      isRescreen: boolean;
      screeningDetail?: 'parse_error' | 'ai_error' | 'flagged' | 'text_changed' | 'incomplete';
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
  screeningDetail: 'parse_error' | 'ai_error' | 'text_changed' | 'incomplete';
  message: string;
  /** Solo per "testo cambiato": lascia nel registro il fatto che l'impronta esaminata non è più quella attuale. */
  recordTextChanged?: { fingerprint: string; examinedChars: number; sourceChars: number };
}

/**
 * Rapporto di moderazione + revisore + email/notifiche (parte condivisa della
 * coda umana dopo uno screening che non pubblica).
 */
async function openScreeningManualReviewReport(args: {
  serviceClient: AnyClient;
  biographyId: string;
  authorId: string;
  contentLanguage: string;
  previousReviewerId: string | null;
  reportDescription: string;
  reportSummary: string;
}): Promise<void> {
  const { serviceClient, biographyId, authorId, contentLanguage } = args;

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

  if (errorReviewerId && (errorReport as { id?: string } | null)?.id) {
    const reportId = (errorReport as { id: string }).id;
    await serviceClient
      .from('moderation_reports')
      .update({
        status: 'assigned',
        assigned_to: errorReviewerId,
        assigned_moderator_id: errorReviewerId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    const assignMsg = REVIEW_ASSIGNED_MESSAGES[contentLanguage] ?? REVIEW_ASSIGNED_MESSAGES['en'];
    await notifyReviewerAssignedEmail({
      client: serviceClient,
      reviewerId: errorReviewerId,
      biographyId,
      contentLanguage,
      notificationMessage: assignMsg,
    });
  }

  if (authorId) {
    const underReviewMsg = UNDER_REVIEW_MESSAGES[contentLanguage] ?? UNDER_REVIEW_MESSAGES['en'];
    await notifyAuthorPublicationEmail({
      client: serviceClient,
      authorId,
      biographyId,
      templateId: 'publication_under_review',
      contentLanguage,
      notificationMessage: underReviewMsg,
    });
  }
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

  await openScreeningManualReviewReport({
    serviceClient,
    biographyId,
    authorId,
    contentLanguage,
    previousReviewerId: args.previousReviewerId,
    reportDescription: args.reportDescription,
    reportSummary: args.reportSummary,
  });

  return {
    result: 'under_review',
    message: args.message,
    isRescreen: args.isRescreen,
    screeningDetail: args.screeningDetail,
  };
}

export type ScreeningFailureCause = 'failed' | 'interrupted' | 'start_failed';

const SCREENING_FAILURE_CAUSE_LABEL: Record<ScreeningFailureCause, string> = {
  failed: 'failed',
  interrupted: 'interrupted',
  start_failed: 'could not start',
};

/**
 * Lavoro di screening caduto o interrotto → stessa coda umana di un errore AI
 * rilevato dalla pipeline. Presa atomica su `pending`; se la scheda è già uscita
 * da pending non fa nulla. Non lancia mai (fallimenti dopo la presa restano
 * `ai_error` e l'autore può usare «Riprova analisi»).
 */
export async function routeScreeningFailureToManualReview(
  client: AnyClient,
  biographyId: string,
  cause: ScreeningFailureCause
): Promise<void> {
  try {
    const { data: claimed } = await client
      .from('biographies')
      .update({ ai_screening_status: 'ai_error' })
      .eq('id', biographyId)
      .eq('ai_screening_status', 'pending')
      .in('status', ['under_review', 'locked_pending_screening'])
      .select('id, status, user_id, record_language_tag');

    const rows = (Array.isArray(claimed) ? claimed : claimed ? [claimed] : []) as Array<{
      id?: string;
      status?: string;
      user_id?: string;
      record_language_tag?: string | null;
    }>;
    const row = rows[0];
    if (!row?.id) return;

    const priorStatus = row.status ?? null;
    if (priorStatus === 'locked_pending_screening') {
      await client
        .from('biographies')
        .update({ status: 'under_review' })
        .eq('id', biographyId)
        .eq('status', 'locked_pending_screening');
    }

    const authorId = row.user_id ?? '';
    const contentLanguage = resolveRecordLanguageTag(row);
    const causeLabel = SCREENING_FAILURE_CAUSE_LABEL[cause];

    await openScreeningManualReviewReport({
      serviceClient: client,
      biographyId,
      authorId,
      contentLanguage,
      previousReviewerId: null,
      reportDescription: `Screening job did not complete (${causeLabel}) — routed to manual review`,
      reportSummary: `The screening job did not finish (${causeLabel}). Manual review required.`,
    });
  } catch (err) {
    console.error('[routeScreeningFailureToManualReview]', { biographyId, cause, err });
  }
}

interface ScreeningPass {
  authorId: string;
  contentLanguage: string;
  /** Testo di origine (interamente spezzato in pezzi dallo screening). */
  text: string;
  /** Caratteri esaminati (somma dei body dei pezzi con verdetto). */
  examinedChars: number;
  /** Lunghezza del testo di partenza. */
  sourceChars: number;
  /** Impronta del testo pubblico nel momento in cui lo screening lo legge. */
  fingerprint: string;
  screening: Awaited<ReturnType<typeof runPublicationScreening>>;
  verdict: ScreeningVerdict;
}

/**
 * Un esame: impronta del testo pubblico, lettura del testo a pezzi, traccia nel
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

  const examinedChars = screening.aiError
    ? (screening.examinedChars ?? 0)
    : (screening.examinedChars ?? text.length);

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
    examinedChars,
    sourceChars,
  });

  return {
    authorId,
    contentLanguage,
    text,
    examinedChars,
    sourceChars,
    fingerprint,
    screening,
    verdict,
  };
}

export interface ReviewScreeningOutcome {
  verdict: ScreeningVerdict;
  fingerprint: string;
  examinedChars: number;
  sourceChars: number;
  /** Vero se examined_chars < source_chars: la persona deve leggere il testo per intero. */
  partial: boolean;
  overallSeverity: number;
  flaggedPassages: Array<{
    text: string;
    section_key: string | null;
    reason: string;
    level: number;
    chunk_index?: number;
    chunk_start?: number;
    chunk_end?: number;
    part_title?: string | null;
  }>;
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
    examinedChars: pass.examinedChars,
    sourceChars: pass.sourceChars,
    partial: pass.examinedChars < pass.sourceChars,
    overallSeverity: pass.screening.overall_severity ?? 0,
    flaggedPassages: pass.screening.passages.map((p) => ({
      text: p.text,
      section_key: p.section_key ?? null,
      reason: p.reason,
      level: p.severity,
      chunk_index: p.chunk_index,
      chunk_start: p.chunk_start,
      chunk_end: p.chunk_end,
      part_title: p.part_title,
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
    examinedChars,
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
        recordTextChanged: {
          fingerprint: examinedFingerprint,
          examinedChars,
          sourceChars,
        },
      });

    // Ultima verifica: examined_chars deve coincidere con source_chars. Se no (pezzo
    // saltato o conteggio incoerente) è uno screening incompleto → coda umana.
    if (examinedChars < sourceChars) {
      return routeToManualReview({
        serviceClient,
        biographyId,
        authorId,
        contentLanguage,
        priorStatus,
        previousReviewerId,
        isRescreen,
        aiScreeningStatus: 'pending',
        reportDescription: 'Incomplete screening — routed to manual review',
        reportSummary: `Screening covered ${examinedChars} of ${sourceChars} characters; automatic publication requires every character to have been examined. A person must review the whole text.`,
        screeningDetail: 'incomplete',
        message: 'screening_incomplete',
      });
    }

    // Prima dell'identificativo UM (permanente): se il testo è cambiato, niente UM.
    const precheck = await checkPublishGate(serviceClient, {
      biographyId,
      mode: 'auto',
      expectedFingerprint: examinedFingerprint,
    });
    if (!precheck.ok) return textChanged(precheck.message);

    const { data: priorBio } = await serviceClient
      .from('biographies')
      .select('biography_type, published_at, provisional_until, translation_of')
      .eq('id', biographyId)
      .maybeSingle();
    const prior = priorBio as {
      biography_type?: string | null;
      published_at?: string | null;
      provisional_until?: string | null;
      translation_of?: string | null;
    } | null;

    if (prior?.translation_of) {
      const { editionMayPublish } = await import('@/lib/server/edition-publish');
      const { data: original } = await serviceClient
        .from('biographies')
        .select('status')
        .eq('id', prior.translation_of)
        .maybeSingle();
      if (!editionMayPublish({
        translationOf: prior.translation_of,
        originalStatus: (original as { status?: string } | null)?.status ?? null,
      })) {
        const { data: held, error: holdError } = await serviceClient
          .from('biographies')
          .update({ status: 'final_version', ai_screening_status: null })
          .eq('id', biographyId)
          .eq('status', 'locked_pending_screening')
          .select('id')
          .maybeSingle();
        if (holdError) throw new Error(`hold_for_original_failed: ${holdError.message}`);
        if (held) {
          return {
            result: 'held_for_original',
            screeningStatus: 'passed',
            isRescreen,
          };
        }
      }
    } else {
      const { ensureUmIdFor } = await import('@/lib/server/um-id-registry');
      await ensureUmIdFor(serviceClient, biographyId);
    }
    const publishedAt = prior?.published_at ?? new Date().toISOString();
    const publishPatch: Record<string, string> = {
      status: 'published',
      ai_screening_status: 'passed',
    };
    if (!prior?.published_at) publishPatch.published_at = publishedAt;
    if (!prior?.translation_of && prior?.biography_type === 'memorial' && !prior.provisional_until && !prior.published_at) {
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

    if (!prior?.translation_of) {
      try {
        const { syncArchivePackage } = await import('@/lib/server/archive-package-store');
        await syncArchivePackage(serviceClient, biographyId, 'publication');
      } catch (err) {
        console.error('[review-submit-pipeline] archive package failed (non-blocking):', err);
      }
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
