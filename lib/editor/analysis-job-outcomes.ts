/**
 * Logica UI sugli esiti dello screening (stessa di prima del blocco async).
 * Estratta per non duplicarla tra invio e approvazione PDF.
 */

export type ScreeningDetail =
  | 'flagged'
  | 'ai_error'
  | 'parse_error'
  | 'text_changed'
  | 'incomplete';

export type ScreeningJobOutcome =
  | { result: 'published'; screeningStatus?: string; isRescreen?: boolean }
  | {
      result: 'under_review';
      message?: string;
      isRescreen?: boolean;
      screeningDetail?: ScreeningDetail;
      flagCount?: number;
    };

export type AiScreeningUi =
  | 'passed'
  | 'flagged'
  | 'pending'
  | 'ai_error'
  | 'parse_error'
  | null;

export function normalizeScreeningOutcome(raw: unknown): ScreeningJobOutcome | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.result === 'published') {
    return {
      result: 'published',
      screeningStatus: typeof o.screeningStatus === 'string' ? o.screeningStatus : undefined,
      isRescreen: o.isRescreen === true,
    };
  }
  if (o.result === 'under_review') {
    const d = o.screeningDetail;
    const detail: ScreeningDetail | undefined =
      d === 'flagged' ||
      d === 'ai_error' ||
      d === 'parse_error' ||
      d === 'text_changed' ||
      d === 'incomplete'
        ? d
        : undefined;
    return {
      result: 'under_review',
      message: typeof o.message === 'string' ? o.message : undefined,
      isRescreen: o.isRescreen === true,
      screeningDetail: detail,
      flagCount: typeof o.flagCount === 'number' ? o.flagCount : undefined,
    };
  }
  return null;
}

/** Esito di lavoro failed/interrupted → come ai_error. */
export function outcomeFromFailedJob(): ScreeningJobOutcome {
  return { result: 'under_review', screeningDetail: 'ai_error', isRescreen: false };
}

export type SubmitOutcomeEffects = {
  biographyStatus: 'published' | 'under_review';
  aiScreeningResult: AiScreeningUi;
  toast?: { type: 'error' | 'info'; key: 'text_changed' | 'incomplete' };
};

export function applySubmitOutcome(outcome: ScreeningJobOutcome): SubmitOutcomeEffects {
  if (outcome.result === 'published') {
    return { biographyStatus: 'published', aiScreeningResult: 'passed' };
  }
  const d = outcome.screeningDetail;
  if (d === 'ai_error' || d === 'parse_error') {
    return { biographyStatus: 'under_review', aiScreeningResult: d };
  }
  if (d === 'text_changed') {
    return {
      biographyStatus: 'under_review',
      aiScreeningResult: 'pending',
      toast: { type: 'error', key: 'text_changed' },
    };
  }
  if (d === 'incomplete') {
    return {
      biographyStatus: 'under_review',
      aiScreeningResult: 'pending',
      toast: { type: 'info', key: 'incomplete' },
    };
  }
  return { biographyStatus: 'under_review', aiScreeningResult: 'flagged' };
}

export type ApproveOutcomeEffects = SubmitOutcomeEffects & {
  ai_screening_status: string;
  loadFlaggedPassages: boolean;
};

export function applyApproveOutcome(outcome: ScreeningJobOutcome): ApproveOutcomeEffects {
  if (outcome.result === 'published') {
    return {
      biographyStatus: 'published',
      aiScreeningResult: 'passed',
      ai_screening_status: 'passed',
      loadFlaggedPassages: false,
    };
  }
  const d = outcome.screeningDetail;
  if (d === 'ai_error' || d === 'parse_error') {
    return {
      biographyStatus: 'under_review',
      aiScreeningResult: d,
      ai_screening_status: d,
      loadFlaggedPassages: false,
    };
  }
  if (d === 'text_changed' || d === 'incomplete') {
    return {
      biographyStatus: 'under_review',
      aiScreeningResult: 'pending',
      ai_screening_status: 'pending',
      loadFlaggedPassages: false,
      toast:
        d === 'text_changed'
          ? { type: 'error', key: 'text_changed' }
          : { type: 'info', key: 'incomplete' },
    };
  }
  return {
    biographyStatus: 'under_review',
    aiScreeningResult: 'flagged',
    ai_screening_status: 'flagged',
    loadFlaggedPassages: true,
  };
}
