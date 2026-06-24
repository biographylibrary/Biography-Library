import { describe, expect, it } from 'vitest';
import type { jsPDF } from 'jspdf';
import { hyphenateWordSyllables, normalizePdfLanguage } from '@/lib/pdf/hyphenation';
import { wrapTextToLines } from '@/lib/pdf/text-wrap';

function mockDoc(charWidth = 2): jsPDF {
  return {
    getTextWidth: (text: string) => text.length * charWidth,
  } as unknown as jsPDF;
}

describe('normalizePdfLanguage', () => {
  it('maps supported biography languages', () => {
    expect(normalizePdfLanguage('it')).toBe('it');
    expect(normalizePdfLanguage('en-US')).toBe('en');
    expect(normalizePdfLanguage('de')).toBe('de');
    expect(normalizePdfLanguage('fr')).toBe('fr');
    expect(normalizePdfLanguage('es')).toBe('en');
  });
});

describe('hyphenateWordSyllables', () => {
  it('splits Italian words on syllable boundaries', () => {
    expect(hyphenateWordSyllables('gesti', 'it')).toEqual(['ge', 'sti']);
    expect(hyphenateWordSyllables('epoca', 'it')).toEqual(['epo', 'ca']);
    expect(hyphenateWordSyllables('presenza', 'it')).toEqual(['pre', 'sen', 'za']);
  });
});

describe('wrapTextToLines', () => {
  it('breaks Italian words with a hyphen at line end', () => {
    const doc = mockDoc(2);
    const lines = wrapTextToLines(doc, 'gesti', 9, 'it').map((l) => l.display);
    expect(lines).toEqual(['ge-', 'sti']);
  });

  it('prefers word boundaries over hyphenation', () => {
    const doc = mockDoc(2);
    const text = 'Nel capitolo dedicato';
    const lines = wrapTextToLines(doc, text, 30, 'it').map((l) => l.display);
    expect(lines[0]).toBe('Nel capitolo');
    expect(lines[1]).toBe('dedicato');
  });

  it('hyphenates English words when needed', () => {
    const doc = mockDoc(2);
    const lines = wrapTextToLines(doc, 'hyphenation', 8, 'en').map((l) => l.display);
    expect(lines.some((l) => l.endsWith('-'))).toBe(true);
    expect(lines.join('').replace(/-/g, '')).toBe('hyphenation');
  });
});
