import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_HORIZONTAL_RULE,
  archiveMarkdownToHtml,
  escapeMarkdownBlockLine,
  htmlParagraphPlainText,
  htmlToArchiveMarkdown,
  normalizeArchiveHorizontalRules,
  roundTripArchiveMarkdown,
  storedToPlainText,
  storedToSafeHtml,
} from '@/lib/archive-markdown';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';

function plainParagraphRoundTrip(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const md = htmlToArchiveMarkdown(`<p>${escaped}</p>`);
  const html = archiveMarkdownToHtml(md);
  return htmlParagraphPlainText(html);
}

describe('archive markdown round-trip', () => {
  it('roundtrips admitted structure', () => {
    const md = [
      '# Titolo',
      '',
      '## Sottotitolo',
      '',
      '### Terzo',
      '',
      'Testo con **grassetto** e *corsivo*.',
      '',
      '- uno',
      '- due',
      '  - annidato',
      '',
      '1. primo',
      '2. secondo',
      '',
      '> citazione',
      '',
      'Vedi [sito](https://example.com/path).',
      '',
      ARCHIVE_HORIZONTAL_RULE,
      '',
      'Dopo il separatore.',
    ].join('\n');

    expect(roundTripArchiveMarkdown(md)).toBe(md);
    expect(roundTripArchiveMarkdown(roundTripArchiveMarkdown(md))).toBe(md);
  });

  it('preserves plain paragraphs that look like Markdown', () => {
    const cases = [
      '1. Introduzione',
      '3) punto',
      '* * *',
      '# non è un titolo',
      '- trattino',
      '+ più',
      '> segno',
      'a < b',
      '<3',
      '&amp;',
      '_sotto_',
      '*asterisco*',
      '[parentesi](non un link)',
      'barra \\ rovesciata',
      '日本語と العربية و Ελληνικά',
      'Ciao 👋🌍',
    ];

    for (const c of cases) {
      expect(plainParagraphRoundTrip(c)).toBe(c);
      const md = htmlToArchiveMarkdown(
        `<p>${c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
      );
      expect(roundTripArchiveMarkdown(md)).toBe(md);
    }
  });

  it('preserves a hard break (two trailing spaces + newline)', () => {
    const md = 'prima riga  \nseconda riga';
    expect(roundTripArchiveMarkdown(md)).toBe(md);
  });

  it('normalizes --- and ___ separators to ***', () => {
    expect(normalizeArchiveHorizontalRules('Prima\n\n---\n\nDopo')).toContain(ARCHIVE_HORIZONTAL_RULE);
    expect(normalizeArchiveHorizontalRules('Prima\n\n___\n\nDopo')).toContain(ARCHIVE_HORIZONTAL_RULE);
    expect(normalizeArchiveHorizontalRules('Prima\n\n* * *\n\nDopo')).toBe(
      `Prima\n\n${ARCHIVE_HORIZONTAL_RULE}\n\nDopo`
    );
    const html = archiveMarkdownToHtml('Prima\n\n---\n\nDopo');
    expect(html).toContain('<hr>');
    expect(htmlToArchiveMarkdown(html)).toBe(`Prima\n\n${ARCHIVE_HORIZONTAL_RULE}\n\nDopo`);
  });

  it('does not treat mid-line *** as a scene separator', () => {
    expect(normalizeArchiveHorizontalRules('***ero già lontano***')).toBe('***ero già lontano***');
    expect(normalizeArchiveHorizontalRules('prima *** mid')).toBe('prima *** mid');
    expect(normalizeArchiveHorizontalRules('Poi disse: ***«frase»***, e nessuno...')).toBe(
      'Poi disse: ***«frase»***, e nessuno...'
    );
    expect(archiveMarkdownToHtml('***ero già lontano***')).not.toContain('<hr');
    expect(archiveMarkdownToHtml('***ero già lontano***')).toMatch(/<(strong|em)>/i);
  });

  it('serializes bold+italic as unambiguous **_…_** / _**…**_', () => {
    expect(htmlToArchiveMarkdown('<p><strong><em>«frase»</em></strong></p>')).toBe('**_«frase»_**');
    expect(htmlToArchiveMarkdown('<p><em><strong>«frase»</strong></em></p>')).toBe('_**«frase»**_');
    expect(htmlToArchiveMarkdown('<p><strong><em>x</em></strong></p>')).not.toContain('***');
  });

  it('does not execute raw HTML in Markdown', () => {
    const html = storedToSafeHtml('Ciao <script>alert(1)</script> **mondo**');
    expect(html).not.toMatch(/<script\b/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong>mondo</strong>');
  });

  it('escape helper matches serializer for a block line', () => {
    expect(escapeMarkdownBlockLine('1. Introduzione')).toBe('1\\. Introduzione');
    expect(escapeMarkdownBlockLine('# non è un titolo')).toBe('\\# non è un titolo');
  });

  it('protects list-item line starts like paragraphs (1944. # - --- …)', () => {
    const heads = [
      '1944. Fu l\'anno',
      '1) non elenco',
      '# non titolo',
      '- altro',
      '+ più',
      '> non citazione',
      '***',
      '---',
      'voce normale',
    ];
    for (const head of heads) {
      const html = `<ul><li><p>${head
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</p></li></ul>`;
      const md = htmlToArchiveMarkdown(html);
      expect(storedToPlainText(md)).toBe(head);
      // Must stay one bullet item, not a nested list / heading / scene break.
      expect(md.startsWith('- ')).toBe(true);
      expect(md).not.toMatch(/^\*\*\*$/m);
      expect(archiveMarkdownToHtml(md)).toMatch(/<li>/);
      expect(archiveMarkdownToHtml(md)).not.toMatch(/<hr\b/i);
      expect(roundTripArchiveMarkdown(md)).toBe(md);
    }
  });

  it('paste/import cleanup flattens tables and drops images with warnings', () => {
    const cleaned = cleanEditorIncomingHtml(
      '<p style="color:red"><u>Ciao</u></p><table><tr><td>A</td><td>B</td></tr></table><p><img src="x.jpg" alt="foto"> fine</p>'
    );
    expect(cleaned.warnings).toEqual(expect.arrayContaining(['tables', 'images']));
    expect(cleaned.markdown).toContain('Ciao');
    expect(cleaned.markdown).toMatch(/A\n\nB/);
    expect(cleaned.markdown).not.toContain('AB');
    expect(cleaned.markdown).toContain('fine');
    expect(cleaned.markdown).not.toContain('<table');
    expect(cleaned.html).toContain('<p>A</p>');
    expect(cleaned.html).toContain('<p>B</p>');
    expect(cleaned.html).not.toContain('style=');
    expect(cleaned.html).not.toContain('<u>');
    expect(cleaned.html).not.toContain('<img');
  });
});
