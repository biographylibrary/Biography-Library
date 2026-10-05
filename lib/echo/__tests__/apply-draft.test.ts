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

describe('placeDraftInDocument: pezzo da sostituire con differenze di forma', () => {
  const replaced = (current: string, replaceText: string, draft: string) => {
    const result = placeDraftInDocument(current, draft, { replaceText });
    return result.ok ? result.text : null;
  };

  it('trova il pezzo anche se l\'apostrofo e le virgolette sono tipografici nel testo e semplici nel pezzo', () => {
    const doc = 'Sento ancora l\u2019eco di quelle \u201Cscuole sballate\u201D in ogni cosa.\n\nFine.';
    const text = replaced(doc, 'l\'eco di quelle "scuole sballate" in ogni cosa', 'il ricordo di quelle scuole');
    expect(text).toBe('Sento ancora il ricordo di quelle scuole.\n\nFine.');
  });

  it('trova il pezzo se il trattino lungo e gli spazi sono diversi (a capo, spazi doppi, spazio rigido)', () => {
    const doc = 'Prima del viaggio \u2014 racconta mia madre \u2014 c\'era la casa  bianca\nnel verde.';
    expect(replaced(doc, 'viaggio - racconta mia madre - c\'era la casa bianca nel verde', 'viaggio')).toBe('Prima del viaggio.');
    expect(replaced('Una casa\u00A0bianca nel verde.', 'casa bianca nel verde', 'villa')).toBe('Una villa.');
  });

  it('trova il pezzo se nel testo c\'è grassetto o corsivo e nel pezzo no, e lascia a posto i segni', () => {
    const doc = 'Il **primo ricordo** nitido è una casa.';
    expect(replaced(doc, 'Il primo ricordo nitido', 'Il ricordo')).toBe('Il ricordo è una casa.');
    // Il pezzo sta tutto dentro il grassetto: i segni restano attorno al testo nuovo.
    expect(replaced('Una **casa bianca nel verde** vera.', 'casa bianca nel verde', 'villa al mare')).toBe('Una **villa al mare** vera.');
  });

  it('rifiuta una corrispondenza che taglierebbe a metà una coppia di segni di markdown', () => {
    // Il pezzo inizia dopo l\'apertura del grassetto e finisce dopo la chiusura: lascerebbe un ** aperto.
    expect(replaced('Una **casa bianca** nel verde.', 'bianca nel verde', 'nuova')).toBeNull();
  });

  it('non cerca per forma i pezzi troppo corti (restano solo corrispondenze esatte)', () => {
    expect(replaced('Ciao \u201Cmondo\u201D bello', '"mondo"', 'x')).toBeNull();
  });

  it('non inventa: un pezzo fatto unendo punti diversi del testo non si trova', () => {
    const doc = 'Primo paragrafo con alcune parole.\n\nSecondo paragrafo diverso.\n\nTerzo paragrafo finale.';
    expect(replaced(doc, 'alcune parole. Terzo paragrafo finale.', 'x')).toBeNull();
  });

  it('con piu occorrenze sostituisce la prima, come la corrispondenza esatta', () => {
    const doc = 'Una frase uguale.\n\nAltro.\n\nUna frase uguale.';
    const text = replaced(doc.replace('Una frase uguale.', 'Una \u201Cfrase\u201D uguale.'), 'Una "frase" uguale.', 'Cambiata.');
    expect(text).toBe('Cambiata.\n\nAltro.\n\nUna frase uguale.');
  });
});
