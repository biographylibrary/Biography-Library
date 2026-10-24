import { describe, expect, it } from 'vitest';
import {
  PASSWORD_DIGIT_CHARS,
  PASSWORD_LOWERCASE_CHARS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SYMBOL_CHARS,
  PASSWORD_UPPERCASE_CHARS,
  evaluatePassword,
  formatMissingPasswordRequirements,
  resolvePasswordAuthError,
} from '@/lib/password-policy';
import { translations } from '@/lib/i18n/translations';

describe('lib/password-policy — costanti e evaluatePassword', () => {
  it('espone le costanti esatte di Supabase Zurigo', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(PASSWORD_LOWERCASE_CHARS).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(PASSWORD_UPPERCASE_CHARS).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(PASSWORD_DIGIT_CHARS).toBe('0123456789');
    expect(PASSWORD_SYMBOL_CHARS).toBe('!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~');
  });

  it('rifiuta "123456" segnalando lunghezza, minuscola, maiuscola e simbolo mancanti', () => {
    const res = evaluatePassword('123456');
    expect(res.valid).toBe(false);
    expect(res.rules).toEqual({
      minLength: false,
      lowercase: false,
      uppercase: false,
      digit: true,
      symbol: false,
    });
    expect(res.missing).toEqual(['minLength', 'lowercase', 'uppercase', 'symbol']);
  });

  it('rifiuta "abcdefghijkl" segnalando maiuscola, cifra e simbolo mancanti', () => {
    const res = evaluatePassword('abcdefghijkl');
    expect(res.valid).toBe(false);
    expect(res.rules).toEqual({
      minLength: true,
      lowercase: true,
      uppercase: false,
      digit: false,
      symbol: false,
    });
    expect(res.missing).toEqual(['uppercase', 'digit', 'symbol']);
  });

  it('accetta "Password123!" e altre password valide', () => {
    for (const validPwd of ['Password123!', 'Sicurezza~2026', 'Abcdefgh1?']) {
      const res = evaluatePassword(validPwd);
      expect(res.valid).toBe(true);
      expect(res.missing).toEqual([]);
      expect(res.rules).toEqual({
        minLength: true,
        lowercase: true,
        uppercase: true,
        digit: true,
        symbol: true,
      });
    }
  });

  it('gestisce le lettere accentate: non sostituiscono a-z / A-Z ASCII ma sono ammesse se i requisiti ASCII sono soddisfatti', () => {
    const onlyAccentedUpper = evaluatePassword('ÀÈÌÒÙabcdef1!');
    expect(onlyAccentedUpper.valid).toBe(false);
    expect(onlyAccentedUpper.rules.uppercase).toBe(false);
    expect(onlyAccentedUpper.missing).toEqual(['uppercase']);

    const onlyAccentedLower = evaluatePassword('ABCDEFÀÈÌÒÙ1!');
    expect(onlyAccentedLower.valid).toBe(false);
    expect(onlyAccentedLower.rules.lowercase).toBe(false);
    expect(onlyAccentedLower.missing).toEqual(['lowercase']);

    const withAsciiAndAccents = evaluatePassword('CaffèLungo1!');
    expect(withAsciiAndAccents.valid).toBe(true);
    expect(withAsciiAndAccents.missing).toEqual([]);
  });

  it('non conta simboli fuori elenco come "€", mentre accetta ciascuno dei simboli in PASSWORD_SYMBOL_CHARS', () => {
    const euroOnly = evaluatePassword('Password123€');
    expect(euroOnly.valid).toBe(false);
    expect(euroOnly.rules.symbol).toBe(false);
    expect(euroOnly.missing).toEqual(['symbol']);

    for (const sym of PASSWORD_SYMBOL_CHARS) {
      const candidate = `Password12${sym}`;
      const res = evaluatePassword(candidate);
      expect(res.valid, `simbolo "${sym}" dovrebbe essere valido`).toBe(true);
    }
  });
});

describe('lib/password-policy — formatMissingPasswordRequirements e resolvePasswordAuthError', () => {
  it('formatta l’elenco dei requisiti mancanti nelle quattro lingue', () => {
    expect(
      formatMissingPasswordRequirements(['uppercase', 'symbol'], translations.it.auth)
    ).toBe('Manca: una lettera maiuscola e un simbolo (per esempio ! ? # %)');

    expect(
      formatMissingPasswordRequirements(['uppercase', 'symbol'], translations.en.auth)
    ).toBe('Missing: an uppercase letter and a symbol (for example ! ? # %)');

    expect(
      formatMissingPasswordRequirements(['uppercase', 'symbol'], translations.fr.auth)
    ).toBe('Il manque : une lettre majuscule et un symbole (par exemple ! ? # %)');

    expect(
      formatMissingPasswordRequirements(['uppercase', 'symbol'], translations.de.auth)
    ).toBe('Es fehlt: ein Großbuchstabe und ein Sonderzeichen (zum Beispiel ! ? # %)');

    expect(formatMissingPasswordRequirements([], translations.it.auth)).toBe(
      translations.it.auth.passwordValid
    );
  });

  it('mappa weak_password con reasons ("pwned", "length", "characters") nella lingua dell’interfaccia senza testo inglese grezzo', () => {
    const pwnedErr = {
      name: 'AuthWeakPasswordError',
      code: 'weak_password',
      message: 'Password is known to be weak and easy to guess, please choose a different one.',
      reasons: ['pwned'],
    };

    expect(resolvePasswordAuthError(pwnedErr, translations.it.auth)).toBe(
      "Questa password compare in elenchi di password compromesse: scegline un'altra"
    );
    expect(resolvePasswordAuthError(pwnedErr, translations.en.auth)).toBe(
      translations.en.auth.passwordPwned
    );
    expect(resolvePasswordAuthError(pwnedErr, translations.fr.auth)).toBe(
      translations.fr.auth.passwordPwned
    );
    expect(resolvePasswordAuthError(pwnedErr, translations.de.auth)).toBe(
      translations.de.auth.passwordPwned
    );

    const charsErr = {
      code: 'weak_password',
      message: 'Password should contain at least one character of each...',
      reasons: ['characters'],
    };
    expect(resolvePasswordAuthError(charsErr, translations.it.auth, 'abcdefghij1')).toBe(
      'Manca: una lettera maiuscola e un simbolo (per esempio ! ? # %)'
    );
    expect(resolvePasswordAuthError(charsErr, translations.it.auth)).toBe(
      translations.it.auth.passwordWeakCharacters
    );

    const lenErr = {
      code: 'weak_password',
      message: 'Password should be at least 10 characters.',
      reasons: ['length'],
    };
    expect(resolvePasswordAuthError(lenErr, translations.it.auth)).toBe(
      translations.it.auth.passwordMinLength
    );
  });
});
