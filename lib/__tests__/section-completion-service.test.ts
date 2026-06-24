import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

import { computeSectionCompletionPercent } from '@/lib/section-completion-service';

describe('computeSectionCompletionPercent', () => {
  const allSections = ['childhood', 'education', 'career', 'family'];

  it('returns 0 when there are no sections', () => {
    expect(computeSectionCompletionPercent([], [])).toBe(0);
  });

  it('returns 0 when nothing is completed', () => {
    expect(computeSectionCompletionPercent([], allSections)).toBe(0);
  });

  it('returns 25 for one of four sections', () => {
    expect(computeSectionCompletionPercent(['childhood'], allSections)).toBe(25);
  });

  it('returns 100 when all sections are complete', () => {
    expect(computeSectionCompletionPercent(allSections, allSections)).toBe(100);
  });

  it('ignores unknown section keys', () => {
    expect(computeSectionCompletionPercent(['childhood', 'unknown'], allSections)).toBe(25);
  });

  it('caps at 100 even with duplicate completed keys', () => {
    expect(
      computeSectionCompletionPercent(['childhood', 'childhood', 'education', 'career', 'family'], allSections)
    ).toBe(100);
  });
});
