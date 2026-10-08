import { describe, expect, it } from 'vitest';
import {
  applyApproveOutcome,
  applySubmitOutcome,
  mergePublishedBiographyFields,
  normalizeScreeningOutcome,
  outcomeFromFailedJob,
} from '@/lib/editor/analysis-job-outcomes';
import { getChapterCooldownState } from '@/lib/biography-chapter-cooldown';

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

  it('dopo published: merge dei campi dalla riga → banner cooldown con giorni veri', () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const local = {
      status: 'published' as const,
      published_at: null as string | null,
      next_chapter_available_at: null as string | null,
      chapters_count: 0,
      last_chapter_published_at: null as string | null,
      final_pdf_url: null as string | null,
      listing_cover_url: null as string | null,
    };
    expect(getChapterCooldownState(local)?.daysRemaining).toBe(0);

    const merged = mergePublishedBiographyFields(local, {
      published_at: new Date().toISOString(),
      next_chapter_available_at: future,
      chapters_count: 1,
      last_chapter_published_at: new Date().toISOString(),
      final_pdf_url: 'https://cdn/final.pdf',
      listing_cover_url: 'https://cdn/cover.png',
    });
    expect(merged.next_chapter_available_at).toBe(future);
    expect(merged.chapters_count).toBe(1);
    expect(getChapterCooldownState(merged)?.daysRemaining).toBeGreaterThan(300);
  });
});
