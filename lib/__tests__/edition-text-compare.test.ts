import { describe, expect, it } from 'vitest';
import {
  countIdenticalSections,
  editionTextMatchesOriginal,
  normalizeComparableText,
  textsAreIdentical,
} from '@/lib/edition-text-compare';

describe('normalizeComparableText / textsAreIdentical', () => {
  it('testo identico', () => {
    expect(textsAreIdentical('Ciao mondo', 'Ciao mondo')).toBe(true);
  });

  it('differisce solo per spazi e forma Unicode → identico', () => {
    const a = 'Ciao\n\n  mondo';
    const b = 'Ciao mondo';
    expect(textsAreIdentical(a, b)).toBe(true);
    // é composto vs precomposto
    const nfd = 'café'.normalize('NFD');
    const nfc = 'café'.normalize('NFC');
    expect(normalizeComparableText(nfd)).toBe(normalizeComparableText(nfc));
    expect(textsAreIdentical(nfd, nfc)).toBe(true);
  });

  it('testo diverso (maiuscole contano)', () => {
    expect(textsAreIdentical('Ciao', 'ciao')).toBe(false);
    expect(textsAreIdentical('Uno', 'Due')).toBe(false);
  });
});

describe('editionTextMatchesOriginal', () => {
  it('copia non tradotta', () => {
    expect(
      editionTextMatchesOriginal(
        { content_freeflow: '<p>Storia lunga abbastanza</p>' },
        { content_freeflow: '<p>Storia lunga abbastanza</p>' }
      )
    ).toBe(true);
  });

  it('traduzione diversa', () => {
    expect(
      editionTextMatchesOriginal(
        { content_freeflow: '<p>Translated story</p>' },
        { content_freeflow: '<p>Storia originale</p>' }
      )
    ).toBe(false);
  });
});

describe('countIdenticalSections', () => {
  const long = 'x'.repeat(200);
  const short = 'y'.repeat(50);

  it('conta sezioni uguali sopra la soglia', () => {
    expect(
      countIdenticalSections(
        { a: { text: long }, b: { text: long + 'z' }, c: { text: short } },
        { a: { text: long }, b: { text: long }, c: { text: short } }
      )
    ).toBe(1);
  });

  it('ignora sezioni sotto i 200 caratteri anche se uguali', () => {
    expect(
      countIdenticalSections(
        { a: { text: short } },
        { a: { text: short } }
      )
    ).toBe(0);
  });
});
