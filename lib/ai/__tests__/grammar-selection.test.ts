import { describe, expect, it } from 'vitest';
import {
  GRAMMAR_MAX_CHARS,
  grammarSelectionProblem,
  parseSuggestionsLoose,
  repairJsonStrings,
  pickGrammarCheckExcerpt,
  suggestionsAboutText,
} from '@/lib/ai/grammar';
import { translations } from '@/lib/i18n/translations';

describe('selezione per il controllo grammaticale', () => {
  it('il brano è solo il testo selezionato', () => {
    expect(pickGrammarCheckExcerpt({ selectedText: ' abc ', blockText: 'paragrafo intero' })).toBe('abc');
    expect(pickGrammarCheckExcerpt({ selectedText: '', blockText: 'paragrafo intero' })).toBe('');
  });

  it('senza testo si avvisa, oltre il limite si avvisa, nel limite si procede', () => {
    expect(grammarSelectionProblem('')).toBe('none');
    expect(grammarSelectionProblem('   \n ')).toBe('none');
    expect(grammarSelectionProblem('a'.repeat(GRAMMAR_MAX_CHARS))).toBeNull();
    expect(grammarSelectionProblem('a'.repeat(GRAMMAR_MAX_CHARS + 1))).toBe('too_long');
  });

  it('il limite è 4000 caratteri: ampio per un paragrafo, stretto per l\'intero libro', () => {
    expect(GRAMMAR_MAX_CHARS).toBe(4000);
  });

  for (const lang of ['en', 'it', 'fr', 'de'] as const) {
    it(`${lang}: i testi dell'avviso ci sono e il messaggio del limite ha {count} e {max}`, () => {
      const e = translations[lang].editor;
      expect(e.grammarSelectionTitle.length).toBeGreaterThan(5);
      expect(e.selectParagraphForGrammar).not.toMatch(/cursore|cursor|curseur|Cursor/);
      expect(e.grammarSelectionTooLong).toContain('{count}');
      expect(e.grammarSelectionTooLong).toContain('{max}');
      expect(e.grammarSelectionGotIt.length).toBeGreaterThan(2);
    });
  }
});

describe('suggestionsAboutText', () => {
  const text = 'Ho conosciuto mia moglie ad una festa di paese. Disse che l’altra volta non era andata così.';

  it('scarta le proposte che parlano di un altro testo', () => {
    const out = suggestionsAboutText(
      [
        { id: '1', original: 'ad una festa', suggestion: 'a una festa' },
        { id: '2', original: 'Il fiume è straripato', suggestion: 'Il fiume straripò' },
      ],
      text
    );
    expect(out.map((o) => o.id)).toEqual(['1']);
  });

  it('ritrova il brano anche con apostrofi, virgolette e spazi diversi', () => {
    const out = suggestionsAboutText([{ id: '1', original: "l'altra   volta", suggestion: 'x' }], text);
    expect(out).toHaveLength(1);
    expect(out[0].original).toBe('l’altra volta');
  });

  it('scarta le proposte con «originale» vuoto', () => {
    expect(suggestionsAboutText([{ id: '1', original: '  ', suggestion: 'x' }], text)).toEqual([]);
  });
});

describe('parseSuggestionsLoose', () => {
  it('legge un elenco normale, anche tra apici di codice', () => {
    expect(parseSuggestionsLoose('[{"original":"a","suggestion":"b"}]')).toHaveLength(1);
    expect(parseSuggestionsLoose('```json\n[{"original":"a","suggestion":"b"}]\n```')).toHaveLength(1);
  });

  it('legge un oggetto con la chiave suggestions', () => {
    expect(parseSuggestionsLoose('{"suggestions":[{"original":"a","suggestion":"b"}]}')).toHaveLength(1);
  });

  it('salva gli oggetti completi di una risposta troncata, virgolette comprese', () => {
    const cut =
      '[{"original":"disse \\"ciao\\" e","suggestion":"disse «ciao» e"},{"original":"x","suggestion":"y"},{"original":"tron';
    const out = parseSuggestionsLoose(cut);
    expect(out).toHaveLength(2);
    expect(out?.[0].original).toBe('disse "ciao" e');
  });

  it('senza nessuna proposta leggibile restituisce null', () => {
    expect(parseSuggestionsLoose('Mi dispiace, non posso aiutarti.')).toBeNull();
    expect(parseSuggestionsLoose('[{"original":"tron')).toBeNull();
  });

  it('un elenco vuoto è valido (niente da correggere)', () => {
    expect(parseSuggestionsLoose('[]')).toEqual([]);
  });
});

describe('risposte del modello con JSON scritto male (apostrofi, a capo)', () => {
  // Risposta vera di Apertus: l'apostrofo di «c'ho» scritto come \' dentro una stringa JSON.
  const REAL =
    '[\n  {\n    "id": "x",\n    "original": "non c\'ho creduto",\n    "suggestion": "non ci ho creduto",\n    "explanation": "Correzione di \'c\\\'ho\' in \'ci ho\'."\n  }\n]';

  it('un apostrofo scritto come \\\' non rende la risposta «non valida»', () => {
    expect(() => JSON.parse(REAL)).toThrow();
    const out = parseSuggestionsLoose(REAL);
    expect(out).toHaveLength(1);
    expect(out?.[0].original).toBe("non c'ho creduto");
    expect(out?.[0].explanation).toContain("c'ho");
  });

  it('un a capo vero dentro una stringa si ripara', () => {
    const out = parseSuggestionsLoose('[{"original":"prima\nseconda","suggestion":"prima seconda"}]');
    expect(out).toHaveLength(1);
    expect(out?.[0].original).toBe('prima\nseconda');
  });

  it('una barra rovesciata senza senso si toglie, le sequenze valide restano', () => {
    expect(repairJsonStrings('{"a":"x\\yz \\"q\\" \\\\"}')).toBe('{"a":"xyz \\"q\\" \\\\"}');
  });

  it('salva le proposte complete anche se l\'ultima è troncata e le altre hanno apostrofi sbagliati', () => {
    const cut =
      '[{"original":"c\\\'è","suggestion":"c\'è stato"},{"original":"un po\\\'","suggestion":"un po\'"},{"original":"tron';
    const out = parseSuggestionsLoose(cut);
    expect(out).toHaveLength(2);
    expect(out?.[0].original).toBe("c'è");
  });

  it('il testo prima del JSON, con virgolette, non rovina la riparazione', () => {
    const out = parseSuggestionsLoose('Ecco "le" correzioni:\n[{"original":"c\\\'è","suggestion":"ci è"}]');
    expect(out).toHaveLength(1);
    expect(out?.[0].original).toBe("c'è");
  });
});
