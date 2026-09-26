import { describe, expect, it } from 'vitest';
import { coverFitsB5, fontStyleFlags, spansToHtml } from '@/lib/import/pdf-text';

describe('pdf cover proportion', () => {
  it('accepts the book page and rejects a square', () => {
    expect(coverFitsB5(176, 250)).toBe(true);
    expect(coverFitsB5(1000, 1000)).toBe(false);
  });
});

describe('pdf font marks', () => {
  it('reads bold and italic only from the font name', () => {
    expect(fontStyleFlags('TimesNewRomanPS-BoldItalicMT')).toEqual({ bold: true, italic: true });
    expect(fontStyleFlags('TimesNewRomanPSMT')).toEqual({ bold: false, italic: false });
  });
});

describe('pdf spans to html', () => {
  it('turns a larger line into a chapter and keeps bold', () => {
    const html = spansToHtml([
      { text: 'Chapter One', x: 40, y: 700, width: 120, size: 22, bold: false, italic: false },
      { text: 'She ', x: 40, y: 660, width: 24, size: 12, bold: false, italic: true },
      { text: 'left', x: 64, y: 660, width: 28, size: 12, bold: true, italic: false },
    ]);
    expect(html).toContain('<h1>Chapter One</h1>');
    expect(html).toContain('<em>She </em>');
    expect(html).toContain('<strong>left</strong>');
  });
});
