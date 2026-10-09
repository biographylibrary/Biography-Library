import { describe, expect, it } from 'vitest';
import { editionMayPublish } from '@/lib/server/edition-publish';

describe('editionMayPublish', () => {
  it('un originale si pubblica sempre da questo controllo', () => {
    expect(editionMayPublish({ translationOf: null, originalStatus: null })).toBe(true);
  });

  it('un\'edizione solo se l\'originale è published', () => {
    expect(editionMayPublish({ translationOf: 'orig', originalStatus: 'published' })).toBe(true);
    expect(editionMayPublish({ translationOf: 'orig', originalStatus: 'draft' })).toBe(false);
    expect(editionMayPublish({ translationOf: 'orig', originalStatus: 'under_review' })).toBe(false);
  });
});
