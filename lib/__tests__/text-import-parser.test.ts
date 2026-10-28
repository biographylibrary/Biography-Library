import { describe, expect, it } from 'vitest';
import { parsePastedText, parseTextFile, parseTextFiles, TextImportError } from '@/lib/text-import-parser';

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

  it('converts plain paragraphs to archive Markdown', () => {
    const parsed = parsePastedText('First paragraph.\n\nSecond paragraph.', 'en');
    expect(parsed.content).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('keeps bold and italics as Markdown when the paste is already HTML', () => {
    const parsed = parsePastedText('<p>Un <strong>fatto</strong> e una <em>voce</em>.</p>', 'it');
    expect(parsed.content).toContain('**fatto**');
    expect(parsed.content).toContain('*voce*');
    expect(parsed.hasSections).toBe(false);
  });

  it('file import keeps HTML h1 headings (paste would flatten them)', () => {
    const parsed = parsePastedText(
      '<h1>Infanzia</h1><p>Cresciuto al mare.</p><h1>Carriera</h1><p>Insegnante.</p>',
      'it'
    );
    expect(parsed.hasSections).toBe(true);
    expect(parsed.sections?.map((s) => s.title)).toEqual(['Infanzia', 'Carriera']);
    expect(parsed.sections?.[0].content).toContain('Cresciuto al mare');
  });

  it('exposes TextImportError with a stable name', () => {
    const err = new TextImportError('FILE_TOO_LARGE');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('TextImportError');
    expect(err.message).toBe('FILE_TOO_LARGE');
  });
});

describe('parseTextFiles (la via del dialogo di importazione)', () => {
  const TXT = 'Il mercato del giovedì era pieno di voci.\n\nMia madre comprava le mele «renette» e il pane.\n\nTerzo paragrafo con àèìòù.\n';

  it('un file di testo tiene i paragrafi separati', async () => {
    const parsed = await parseTextFiles([new File([TXT], 'prova.txt')], 'it');
    expect(parsed.content.split('\n\n')).toEqual([
      'Il mercato del giovedì era pieno di voci.',
      'Mia madre comprava le mele «renette» e il pane.',
      'Terzo paragrafo con àèìòù.',
    ]);
  });

  it('due file si uniscono con una riga vuota e senza perdere i paragrafi', async () => {
    const parsed = await parseTextFiles(
      [new File(['Uno.\n\nDue.\n'], 'a.txt'), new File(['Tre.\n\nQuattro.\n'], 'b.txt')],
      'it'
    );
    expect(parsed.content.split('\n\n')).toEqual(['Uno.', 'Due.', 'Tre.', 'Quattro.']);
  });

  it('dà lo stesso risultato di un file letto da solo', async () => {
    const one = await parseTextFile(new File([TXT], 'prova.txt'), 'it');
    const many = await parseTextFiles([new File([TXT], 'prova.txt')], 'it');
    expect(many.content).toBe(one.content);
  });
});
