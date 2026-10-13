import { describe, expect, it } from 'vitest';
import { countLabel } from '@/lib/i18n/count-label';
import type { Language } from '@/lib/i18n/translations';

const one = '{count} item';
const other = '{count} items';

describe('countLabel', () => {
  it.each([
    ['it' as Language, 0, '0 items'],
    ['it' as Language, 1, '1 item'],
    ['it' as Language, 2, '2 items'],
    ['en' as Language, 0, '0 items'],
    ['en' as Language, 1, '1 item'],
    ['en' as Language, 2, '2 items'],
    ['fr' as Language, 0, '0 item'],
    ['fr' as Language, 1, '1 item'],
    ['fr' as Language, 2, '2 items'],
    ['de' as Language, 0, '0 items'],
    ['de' as Language, 1, '1 item'],
    ['de' as Language, 2, '2 items'],
  ])('%s count %i → %s', (language, count, expected) => {
    expect(countLabel(language, count, one, other)).toBe(expected);
  });
});
