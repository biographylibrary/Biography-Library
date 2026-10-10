import { describe, expect, it } from 'vitest';
import { grammarLanguageForTag } from '@/lib/ai/grammar';

describe('grammarLanguageForTag', () => {
  it('accetta le quattro lingue base', () => {
    expect(grammarLanguageForTag('it')).toBe('it');
    expect(grammarLanguageForTag('en')).toBe('en');
    expect(grammarLanguageForTag('fr')).toBe('fr');
    expect(grammarLanguageForTag('de')).toBe('de');
  });

  it('prende la parte prima del trattino', () => {
    expect(grammarLanguageForTag('de-CH')).toBe('de');
  });

  it('rifiuta lingue fuori elenco e valori vuoti', () => {
    expect(grammarLanguageForTag('pt-BR')).toBeNull();
    expect(grammarLanguageForTag('es')).toBeNull();
    expect(grammarLanguageForTag(null)).toBeNull();
    expect(grammarLanguageForTag(undefined)).toBeNull();
    expect(grammarLanguageForTag('')).toBeNull();
  });
});
