import { describe, expect, it } from 'vitest';
import {
  applyApproveOutcome,
  applySubmitOutcome,
  normalizeScreeningOutcome,
  outcomeFromFailedJob,
} from '@/lib/editor/analysis-job-outcomes';

describe('analysis-job-outcomes', () => {
  it('normalize + applySubmit per ogni esito', () => {
    expect(applySubmitOutcome({ result: 'published', screeningStatus: 'passed' })).toMatchObject({
      biographyStatus: 'published',
      aiScreeningResult: 'passed',
    });
    expect(
      applySubmitOutcome({ result: 'under_review', screeningDetail: 'flagged', isRescreen: false })
    ).toMatchObject({ aiScreeningResult: 'flagged' });
    expect(
      applySubmitOutcome({ result: 'under_review', screeningDetail: 'ai_error', isRescreen: false })
    ).toMatchObject({ aiScreeningResult: 'ai_error' });
    expect(
      applySubmitOutcome({ result: 'under_review', screeningDetail: 'incomplete', isRescreen: false })
    ).toMatchObject({ aiScreeningResult: 'pending', toast: { key: 'incomplete' } });
  });

  it('failed/interrupted → ai_error', () => {
    const o = outcomeFromFailedJob();
    expect(o.result).toBe('under_review');
    if (o.result === 'under_review') expect(o.screeningDetail).toBe('ai_error');
  });

  it('approve carica passaggi solo se flagged', () => {
    expect(
      applyApproveOutcome({ result: 'under_review', screeningDetail: 'flagged', isRescreen: false })
        .loadFlaggedPassages
    ).toBe(true);
    expect(
      applyApproveOutcome({ result: 'under_review', screeningDetail: 'ai_error', isRescreen: false })
        .loadFlaggedPassages
    ).toBe(false);
  });

  it('normalize rifiuta too_long e forme sconosciute', () => {
    const n = normalizeScreeningOutcome({
      result: 'under_review',
      screeningDetail: 'too_long',
    });
    expect(n?.result).toBe('under_review');
    if (n?.result === 'under_review') expect(n.screeningDetail).toBeUndefined();
  });
});
