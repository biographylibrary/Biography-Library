import { describe, expect, it } from 'vitest';
import {
  planAtomicBlockBreak,
  planHeadingBreak,
  planParagraphBreak,
  planTextBeforeBlockBreak,
} from '@/lib/pdf/block-pagination';

describe('planParagraphBreak', () => {
  const lineH = 5;
  const bottom = 250;

  it('page breaks when orphan would occur at start', () => {
    const plan = planParagraphBreak(248, lineH, bottom, 4, 0);
    expect(plan.action).toBe('pageBreak');
  });

  it('draws when enough lines fit', () => {
    const plan = planParagraphBreak(100, lineH, bottom, 4, 0);
    expect(plan.action).toBe('draw');
    expect(plan.linesToDraw).toBeGreaterThan(0);
  });
});

describe('planHeadingBreak', () => {
  it('requires heading plus following lines', () => {
    expect(planHeadingBreak(240, 8, 5, 250, 2)).toBe('pageBreak');
    expect(planHeadingBreak(100, 8, 5, 250, 2)).toBe('draw');
  });
});

describe('planAtomicBlockBreak', () => {
  it('page breaks when block taller than remaining space', () => {
    expect(planAtomicBlockBreak(200, 250, 80)).toBe('pageBreak');
    expect(planAtomicBlockBreak(100, 250, 80)).toBe('draw');
  });
});

describe('planTextBeforeBlockBreak', () => {
  it('avoids orphan text before large block', () => {
    const lineH = 5;
    expect(planTextBeforeBlockBreak(240, lineH, 250, 100)).toBe('pageBreak');
    expect(planTextBeforeBlockBreak(100, lineH, 250, 100)).toBe('draw');
  });
});
