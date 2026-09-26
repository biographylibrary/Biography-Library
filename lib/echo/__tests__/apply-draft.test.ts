import { describe, expect, it } from 'vitest';
import { placeDraftInDocument, plainDraftText } from '@/lib/echo/apply-draft';

describe('placeDraftInDocument', () => {
  it('adds new prose at the end of the sheet', () => {
    const next = placeDraftInDocument('Prima frase.', 'Seconda frase nuova.');
    expect(next).toEqual({
      ok: true,
      mode: 'appended',
      text: 'Prima frase.\n\nSeconda frase nuova.',
    });
  });

  it('replaces the sentence Echo was asked to change', () => {
    const current = 'Ricordo la serra riscaldata, dove mia mamma lavorava.\n\nPoi arrivò l\'inverno.';
    const next = placeDraftInDocument(current, 'Ricordo la serra calda, dove mia mamma cuciva.', {
      replaceText: 'Ricordo la serra riscaldata, dove mia mamma lavorava.',
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.text).toContain('Ricordo la serra calda, dove mia mamma cuciva.');
    expect(next.text).not.toContain('serra riscaldata');
    expect(next.text).toContain('Poi arrivò l\'inverno.');
    expect(next.mode).toBe('replaced');
  });

  it('replaces a rewritten sentence where it already stands', () => {
    const current = 'Prima frase.\n\nRicordo la serra riscaldata, dove mia mamma lavorava. Poi arrivò l\'inverno.';
    const next = placeDraftInDocument(
      current,
      'Ricordo la serra calda, dove mia mamma cuciva.',
      { instruction: 'sostituisci la frase sulla serra' }
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.mode).toBe('replaced');
    expect(next.text).toContain('Prima frase.');
    expect(next.text).toContain('Ricordo la serra calda, dove mia mamma cuciva.');
    expect(next.text).toContain('Poi arrivò l\'inverno.');
    expect(next.text.endsWith('Ricordo la serra calda, dove mia mamma cuciva.')).toBe(false);
  });

  it('turns long dashes into commas and does not add the draft at the end', () => {
    const current = 'Era quieto — poi rise. La sera – la mamma cucinava.';
    const next = placeDraftInDocument(current, 'Una frase nuova che non deve finire in fondo.', {
      instruction: 'sostituisci tutti i trattini lunghi con delle virgole',
    });
    expect(next).toEqual({
      ok: true,
      mode: 'dashes',
      text: 'Era quieto, poi rise. La sera, la mamma cucinava.',
    });
  });

  it('does not append when a requested replacement cannot be found', () => {
    const next = placeDraftInDocument('Solo questo testo breve.', 'Qualcosa di completamente diverso.', {
      instruction: 'sostituisci la frase che non c\'è',
    });
    expect(next).toEqual({ ok: false, code: 'replace_not_found' });
  });

  it('adds the text under the named chapter instead of a hidden section', () => {
    const current = '# Infanzia e Primi Anni\n\nEro piccolo.\n\n# Scuola\n\nImparai a leggere.';
    const next = placeDraftInDocument(current, 'La casa era in collina.', {
      chapterTitle: 'Infanzia e Primi Anni',
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.text.indexOf('La casa era in collina.')).toBeGreaterThan(next.text.indexOf('Ero piccolo.'));
    expect(next.text.indexOf('La casa era in collina.')).toBeLessThan(next.text.indexOf('# Scuola'));
  });

  it('adds at the end when that chapter is not in the sheet', () => {
    const next = placeDraftInDocument('Un racconto libero.', 'Una frase in più.', {
      chapterTitle: 'Infanzia e Primi Anni',
    });
    expect(next).toEqual({
      ok: true,
      mode: 'appended',
      text: 'Un racconto libero.\n\nUna frase in più.',
    });
  });
});

describe('plainDraftText', () => {
  it('drops markdown marks so the editor can find the words', () => {
    expect(plainDraftText('**Ciao** mondo')).toBe('Ciao mondo');
  });
});
