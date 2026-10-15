import { describe, expect, it } from 'vitest';
import { translations, type Language } from '@/lib/i18n/translations';

const LOCALES: Language[] = ['en', 'it', 'fr', 'de'];

/** Phrases that must appear (case-insensitive) so each locale stays meaningful. */
const MUST_HINT: Record<Language, RegExp[]> = {
  en: [/saved text/i, /nothing was lost/i, /reload/i, /support/i],
  it: [/testo salvato/i, /non si è perso niente/i, /ricarica/i, /assistenza/i],
  fr: [/texte enregistré/i, /rien n.a été perdu/i, /rechargez/i, /support/i],
  de: [/gespeicherte[r]? text/i, /nichts ist verloren/i, /laden sie die seite/i, /support/i],
};

describe('editor.loadTextLostReadOnly', () => {
  it('exists in all four locales with distinct localized copy', () => {
    const values = LOCALES.map((lang) => translations[lang].editor.loadTextLostReadOnly);
    for (let i = 0; i < LOCALES.length; i++) {
      const lang = LOCALES[i]!;
      const text = values[i]!;
      expect(text.trim().length, `${lang} empty`).toBeGreaterThan(40);
      for (const re of MUST_HINT[lang]) {
        expect(text, `${lang} missing ${re}`).toMatch(re);
      }
    }
    expect(new Set(values).size).toBe(4);
  });
});
