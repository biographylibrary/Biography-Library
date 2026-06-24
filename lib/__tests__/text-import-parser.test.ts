import { describe, expect, it } from 'vitest';
import { parsePastedText, TextImportError } from '@/lib/text-import-parser';

describe('text-import-parser', () => {
  it('parses markdown-style section headings', () => {
    const text = `## Childhood

I grew up near the sea.

## Career

I became a teacher.`;

    const parsed = parsePastedText(text, 'en');
    expect(parsed.hasSections).toBe(true);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections?.[0].title).toBe('Childhood');
    expect(parsed.sections?.[0].content).toContain('grew up near the sea');
    expect(parsed.sections?.[1].title).toBe('Career');
  });

  it('parses triple-equals section markers', () => {
    const text = `=== Family ===

Two brothers and a sister.

=== Travel ===

We visited Corsica every summer.`;

    const parsed = parsePastedText(text, 'it');
    expect(parsed.hasSections).toBe(true);
    expect(parsed.sections?.map((s) => s.title)).toEqual(['Family', 'Travel']);
  });

  it('returns plain content when no section markers are found', () => {
    const parsed = parsePastedText('A single paragraph without headings.', 'en');
    expect(parsed.hasSections).toBe(false);
    expect(parsed.content).toContain('single paragraph');
  });

  it('converts plain paragraphs to HTML', () => {
    const parsed = parsePastedText('First paragraph.\n\nSecond paragraph.', 'en');
    expect(parsed.content).toContain('<p>First paragraph.</p>');
    expect(parsed.content).toContain('<p>Second paragraph.</p>');
  });

  it('exposes TextImportError with a stable name', () => {
    const err = new TextImportError('FILE_TOO_LARGE');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('TextImportError');
    expect(err.message).toBe('FILE_TOO_LARGE');
  });
});
