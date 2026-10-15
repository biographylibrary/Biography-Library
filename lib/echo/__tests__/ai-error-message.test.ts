import { describe, expect, it } from 'vitest';
import { resolveAiErrorMessage } from '@/lib/echo/ai-error-message';
import { translations, type Language } from '@/lib/i18n/translations';

const LANGS: Language[] = ['en', 'it', 'fr', 'de'];

function copyFor(lang: Language) {
  const e = translations[lang].echo;
  return {
    errorGeneric: e.errorGeneric,
    aiFeaturesDisabled: e.aiFeaturesDisabled,
    errorRateLimitBurst: e.errorRateLimitBurst,
    errorRateLimitDaily: e.errorRateLimitDaily,
    errorNotAvailableForEdition: e.errorNotAvailableForEdition,
  };
}

describe('resolveAiErrorMessage', () => {
  it.each(LANGS)('%s: traduce i codici noti e non lascia passare snake_case grezzo', (lang) => {
    const copy = copyFor(lang);
    expect(resolveAiErrorMessage('ai_features_disabled', copy)).toEqual({
      message: copy.aiFeaturesDisabled,
      linkToSettings: true,
    });
    expect(resolveAiErrorMessage('rate_limit_burst', copy)).toEqual({
      message: copy.errorRateLimitBurst,
      linkToSettings: false,
    });
    expect(resolveAiErrorMessage('rate_limit_daily', copy)).toEqual({
      message: copy.errorRateLimitDaily,
      linkToSettings: false,
    });
    expect(resolveAiErrorMessage('echo_not_available_for_edition', copy)).toEqual({
      message: copy.errorNotAvailableForEdition,
      linkToSettings: false,
    });
    expect(resolveAiErrorMessage('some_unknown_code', copy)).toEqual({
      message: copy.errorGeneric,
      linkToSettings: false,
    });
    expect(resolveAiErrorMessage('ai_features_disabled', copy).message).not.toBe('ai_features_disabled');
  });

  it('prova di rottura: senza mappa di ai_features_disabled il codice grezzo resterebbe a schermo', () => {
    const copy = copyFor('it');
    const resolved = resolveAiErrorMessage('ai_features_disabled', copy);
    // Se qualcuno rimuove il case, resolved.message diventerebbe errorGeneric o il grezzo.
    expect(resolved.message).toBe(copy.aiFeaturesDisabled);
    expect(resolved.message).toContain('Impostazioni');
    expect(resolved.linkToSettings).toBe(true);
  });

  it('frase già leggibile: resta invariata', () => {
    const copy = copyFor('en');
    const human = 'The service is temporarily unavailable.';
    expect(resolveAiErrorMessage(human, copy)).toEqual({
      message: human,
      linkToSettings: false,
    });
  });
});
