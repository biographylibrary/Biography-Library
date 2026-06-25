import { describe, expect, it } from 'vitest';
import { resolveUserEmailLocale } from '@shared/email/locale';

describe('resolveUserEmailLocale', () => {
  it('prefers profile language over signup language', () => {
    expect(
      resolveUserEmailLocale({ profileLanguage: 'it', signupLanguage: 'en' }),
    ).toBe('it');
  });

  it('falls back to signup language when profile is missing', () => {
    expect(resolveUserEmailLocale({ signupLanguage: 'fr' })).toBe('fr');
  });

  it('defaults to English when no language is set', () => {
    expect(resolveUserEmailLocale({})).toBe('en');
    expect(resolveUserEmailLocale({ profileLanguage: 'xx' })).toBe('en');
  });
});
