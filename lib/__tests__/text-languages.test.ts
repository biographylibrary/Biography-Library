import { describe, expect, it } from 'vitest';
import {
  TEXT_LANGUAGE_BASES,
  canonicalizeTextLanguage,
  textLanguageIdentity,
  textLanguageLabels,
  textLanguageMatchesQuery,
} from '@/lib/text-languages';
import { isPdfScriptCovered } from '@/lib/pdf/covered-scripts';

describe('lingua del testo', () => {
  it('comprende ISO 639-1 e le lingue minori chieste', () => {
    for (const code of ['en', 'it', 'fr', 'de', 'es', 'rm', 'sc', 'gsw', 'lij', 'lmo', 'fur', 'nap', 'vec']) {
      expect(TEXT_LANGUAGE_BASES).toContain(code);
    }
    expect(TEXT_LANGUAGE_BASES.length).toBeGreaterThan(180);
  });

  it('canonizza il tag, regione compresa', () => {
    expect(canonicalizeTextLanguage('pt-br')).toBe('pt-BR');
    expect(canonicalizeTextLanguage('es-mx')).toBe('es-MX');
    expect(canonicalizeTextLanguage(' ES ')).toBe('es');
    expect(canonicalizeTextLanguage('xx')).toBeNull();
    expect(canonicalizeTextLanguage('en-US-x-private')).toBeNull();
  });

  it('ricava scrittura e direzione', () => {
    expect(textLanguageIdentity('ar')).toMatchObject({ script: 'Arab', direction: 'rtl' });
    expect(textLanguageIdentity('ru')).toMatchObject({ script: 'Cyrl', direction: 'ltr' });
    expect(textLanguageIdentity('el')).toMatchObject({ script: 'Grek', direction: 'ltr' });
    expect(textLanguageIdentity('en')).toMatchObject({ script: 'Latn', direction: 'ltr' });
    expect(isPdfScriptCovered('Latn')).toBe(true);
    expect(isPdfScriptCovered('Arab')).toBe(false);
  });

  it('mostra il nome nell\'interfaccia e nella lingua stessa', () => {
    const labels = textLanguageLabels('es', 'it');
    expect(labels.inUi.toLowerCase()).toContain('spagnol');
    expect(labels.own.toLowerCase()).toContain('español');
    expect(textLanguageMatchesQuery('es', 'spagnolo', ['it', 'en', 'fr', 'de'])).toBe(true);
    expect(textLanguageMatchesQuery('es', 'español', ['it'])).toBe(true);
    expect(textLanguageMatchesQuery('es', 'es', ['en'])).toBe(true);
  });
});
