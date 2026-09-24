import { describe, expect, it } from 'vitest';
import { UM_ALPHABET, isValidUmId } from '@/lib/um-id';
import { shouldHoldOnWaitlist } from '@/lib/waitlist';
import {
  UM_SPEC_ALPHABET,
  UM_SPEC_VECTORS,
  umIdentifierPageCopy,
} from '@/lib/i18n/um-identifier-page';

describe('UM identifier public page', () => {
  it('shows the specification alphabet and the section 7 vectors unchanged', () => {
    expect(UM_SPEC_ALPHABET.replace(/ /g, '')).toBe(UM_ALPHABET.toUpperCase());
    expect(UM_SPEC_VECTORS.map((row) => row.id)).toEqual([
      'UM-0000-K3NQ-7FX2-MVP4',
      'UM-0000-BCDF-GHJK-MNPP',
      'UM-0001-0000-0000-0004',
      'UM-0025-Z9X8-W7V6-T5ST',
      'UM-0100-QQQQ-QQQQ-QQQQ',
      'UM-9999-K3NQ-7FX2-MVP7',
      'UM-10000-K3NQ-7FX2-MVP3',
      'UM-99999-Z9X8-W7V6-T5S2',
    ]);
    for (const row of UM_SPEC_VECTORS) {
      expect(isValidUmId(row.id)).toBe(true);
    }
  });

  it('gives the four languages the same title role and the same vectors', () => {
    const titles = ['Identificativo UM', 'UM identifier', 'Identifiant UM', 'UM-Kennung'];
    for (const [language, title] of [
      ['it', titles[0]],
      ['en', titles[1]],
      ['fr', titles[2]],
      ['de', titles[3]],
    ] as const) {
      const copy = umIdentifierPageCopy(language);
      expect(copy.title).toBe(title);
      expect(copy.sections).toHaveLength(14);
      expect(copy.equalValue.length).toBeGreaterThan(20);
    }
  });

  it('stays reachable while an account is on the waitlist', () => {
    expect(
      shouldHoldOnWaitlist({
        accountStatus: 'waitlist',
        role: 'user',
        pathname: '/um-identifier',
      })
    ).toBe(false);
  });
});
