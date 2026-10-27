import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import { describe, expect, it } from 'vitest';
import {
  archiveMarkdownToHtml,
  htmlToArchiveMarkdown,
  looksLikeStoredHtml,
  roundTripArchiveMarkdown,
  storedToArchiveMarkdown,
  storedToPlainText,
  storedToSafeHtml,
} from '@/lib/archive-markdown';

describe('archive-markdown', () => {
  it('roundtrips headings, emphasis, lists, quotes, and links', () => {
    const html = [
      '<h2>Family</h2>',
      '<p>Hello <strong>world</strong> and <em>peace</em>.</p>',
      '<ul><li><p>One</p></li><li><p>Two</p></li></ul>',
      '<ol><li><p>First</p></li></ol>',
      '<blockquote><p>Quoted</p></blockquote>',
      '<p>See <a href="https://example.com/path">the site</a>.</p>',
    ].join('');

    const md = htmlToArchiveMarkdown(html);
    expect(md).toContain('## Family');
    expect(md).toContain('**world**');
    expect(md).toContain('*peace*');
    expect(md).toMatch(/^- One/m);
    expect(md).toMatch(/^1\. First/m);
    expect(md).toContain('> Quoted');
    expect(md).toContain('[the site](https://example.com/path)');

    const html2 = archiveMarkdownToHtml(md);
    expect(html2).toContain('<h2>Family</h2>');
    expect(html2).toContain('<strong>world</strong>');
    expect(html2).toContain('<em>peace</em>');
    expect(html2).toContain('<blockquote>');
    expect(html2).toContain('href="https://example.com/path"');

    const md2 = htmlToArchiveMarkdown(html2);
    expect(md2).toBe(md);
  });

  it('drops underline, alignment, super/subscript, strike, and scripts', () => {
    const html =
      '<p style="text-align:center"><u>keep</u> <sup>x</sup><sub>y</sub> <s>gone-style</s></p><script>alert(1)</script>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).toContain('keep');
    expect(md).toContain('x');
    expect(md).toContain('y');
    expect(md).toContain('gone-style');
    expect(md).not.toContain('<u>');
    expect(md).not.toContain('alert');
    expect(md).not.toMatch(/\^/);

    const out = storedToSafeHtml(html);
    expect(out).not.toContain('text-align');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<u>');
  });

  it('drops javascript: links and keeps the label', () => {
    const md = htmlToArchiveMarkdown(
      '<p><a href="javascript:alert(1)">click</a> and <a href="https://ok.example">ok</a></p>'
    );
    expect(md).toContain('click');
    expect(md).not.toContain('javascript:');
    expect(md).toContain('[ok](https://ok.example)');
  });

  it('applies NFC on write', () => {
    const composed = 'e\u0301';
    const md = htmlToArchiveMarkdown(`<p>${composed}</p>`);
    expect(md).toBe('é');
  });

  it('treats stored HTML and Markdown both as the original', () => {
    expect(looksLikeStoredHtml('<p>Hi</p>')).toBe(true);
    expect(looksLikeStoredHtml('  <h2>Title</h2>')).toBe(true);
    expect(looksLikeStoredHtml('<ul><li>a</li></ul>')).toBe(true);
    expect(looksLikeStoredHtml('<div>x</div>')).toBe(true);
    expect(looksLikeStoredHtml('<br>')).toBe(true);
    expect(looksLikeStoredHtml('<hr>')).toBe(true);
    expect(looksLikeStoredHtml('<table><tr><td>a</td></tr></table>')).toBe(true);
    expect(looksLikeStoredHtml('<pre>code</pre>')).toBe(true);
    expect(looksLikeStoredHtml('<blockquote>q</blockquote>')).toBe(true);
    expect(looksLikeStoredHtml('## Title\n\nHello **world**.')).toBe(false);
    // Inline-looking markers mid-text must not count as legacy HTML.
    expect(looksLikeStoredHtml('se x<a y allora')).toBe(false);
    expect(looksLikeStoredHtml('\\<b>grassetto finto\\</b>')).toBe(false);
    expect(looksLikeStoredHtml('a < b')).toBe(false);
    expect(looksLikeStoredHtml('<3')).toBe(false);
    expect(looksLikeStoredHtml('il tag <p> serve per i paragrafi')).toBe(false);
    expect(looksLikeStoredHtml('scrivi a <nome@esempio.ch>')).toBe(false);
    // Inline-only openers are not legacy originals (those always start with a block tag).
    expect(looksLikeStoredHtml('<strong>solo</strong>')).toBe(false);
    expect(looksLikeStoredHtml('<span>x</span>')).toBe(false);
    expect(storedToArchiveMarkdown('<p>Hi <strong>there</strong></p>')).toBe('Hi **there**');
    expect(storedToArchiveMarkdown('Hi **there**')).toBe('Hi **there**');
    expect(storedToPlainText('**bold** and *i*')).toBe('bold and i');
    expect(storedToPlainText('<p>Una vita.</p>')).toBe('Una vita.');
    // Empty HTML must not echo the markup as “plain text”.
    expect(storedToPlainText('<p style="text-align: left;"></p>')).toBe('');
  });

  it('wraps legacy plain text as paragraphs', () => {
    const html = storedToSafeHtml('First paragraph.\n\nSecond paragraph.');
    expect(html).toContain('<p>First paragraph.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });

  it('preserves author literal tags as text, not HTML', () => {
    const author = 'il tag <b>grassetto</b> e <p>';
    const fromEditor = htmlToArchiveMarkdown(
      `<p>${author.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    );
    expect(fromEditor).toBe('il tag &lt;b&gt;grassetto&lt;/b&gt; e &lt;p&gt;');
    expect(looksLikeStoredHtml(fromEditor)).toBe(false);
    const html = storedToSafeHtml(fromEditor);
    expect(html).not.toMatch(/<b\b/i);
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&lt;p&gt;');
    expect(storedToPlainText(fromEditor)).toBe(author);
    expect(roundTripArchiveMarkdown(fromEditor)).toBe(fromEditor);
  });
});

describe('grassetto e corsivo con spazi ai bordi della selezione', () => {
  it('lascia gli spazi fuori dai segni, così alla rilettura il grassetto resta grassetto', () => {
    const md = htmlToArchiveMarkdown('<p>Una frase <strong>con </strong>altre parole.</p>');
    expect(md).toBe('Una frase **con** altre parole.');
    expect(storedToPlainText(md)).toBe('Una frase con altre parole.');
    expect(htmlToArchiveMarkdown('<p>a<em> molto</em> b</p>')).toBe('a *molto* b');
    expect(htmlToArchiveMarkdown('<p>a<strong><em> tutto </em></strong>b</p>')).toBe('a **_tutto_** b');
  });

  it('un grassetto fatto solo di spazi non lascia asterischi', () => {
    expect(htmlToArchiveMarkdown('<p>a<strong> </strong>b</p>')).toBe('a b');
  });
});

describe('segni di grassetto e corsivo accanto a punteggiatura e ad altri segni', () => {
  /** Il testo salvato, riletto, deve avere le stesse parole di prima e nessun asterisco in più. */
  const rereadPlain = (html: string) => storedToPlainText(htmlToArchiveMarkdown(html));

  it('un segno che inizia o finisce con punteggiatura attaccata a una lettera non lascia asterischi', () => {
    expect(rereadPlain('<p>N<strong>.1 prova</strong> fine</p>')).toBe('N.1 prova fine');
    expect(rereadPlain('<p>una <em>frase «lunga»</em>parola</p>')).toBe('una frase «lunga»parola');
    expect(rereadPlain('<p><em>fine ☺</em>nonna</p>')).toBe('fine ☺nonna');
  });

  it('corsivo che attraversa una parola in grassetto resta annidato', () => {
    const md = htmlToArchiveMarkdown('<p><em>a </em><strong><em>b</em></strong><em> c</em></p>');
    expect(md).toBe('*a **b** c*');
    expect(rereadPlain('<p><strong>a </strong><em><strong>b</strong></em><strong> c</strong></p>')).toBe('a b c');
  });

  it('grassetto e corsivo attaccati senza spazio restano due segni distinti', () => {
    const md = htmlToArchiveMarkdown('<p><strong>x…</strong><em>a</em>.</p>');
    expect(storedToPlainText(md)).toBe('x…a.');
    expect(md).not.toMatch(/\*\*\*/);
  });

  it('due a capo forzati di fila non spezzano il paragrafo', () => {
    const md = htmlToArchiveMarkdown('<p>prima<br><br>dopo</p>');
    expect(archiveMarkdownToHtml(md)).toBe('<p>prima<br>\n<br>\ndopo</p>');
  });

  it('un a capo forzato a inizio o fine paragrafo non lascia barre rovesciate', () => {
    expect(htmlToArchiveMarkdown('<p><br><br>testo<br><br></p>')).toBe('testo');
    expect(htmlToArchiveMarkdown('<ul><li><p><br><br>voce</p></li></ul>')).toBe('- voce');
  });

  it('un a capo forzato dentro un titolo diventa uno spazio', () => {
    expect(htmlToArchiveMarkdown('<h2>primo<br>secondo</h2>')).toBe('## primo secondo');
    expect(htmlToArchiveMarkdown('<h2><br><br>solo</h2>')).toBe('## solo');
  });
});

describe('voci di elenco con testo formattato', () => {
  it('lo spazio tra una parola in grassetto e una in corsivo non si perde', () => {
    expect(htmlToArchiveMarkdown('<ul><li>a <strong>b</strong> <em>c</em> d</li></ul>')).toBe('- a **b** *c* d');
    const md = '- a **b** *c d* e';
    expect(htmlToArchiveMarkdown(archiveMarkdownToHtml(md))).toBe(md);
  });
});

describe('incolla e importazione di elenchi', () => {
  it('non perde i paragrafi, gli a capo e i sotto-elenchi di una voce', () => {
    const clean = (html: string) => cleanEditorIncomingHtml(html).html;
    expect(clean('<ul><li><p>uno</p><p>due</p></li></ul>')).toBe('<ul><li><p>uno</p><p>due</p></li></ul>');
    expect(clean('<ul><li>uno<br>due</li></ul>')).toBe('<ul><li><p>uno<br>due</p></li></ul>');
    expect(clean('<ul><li>uno<ul><li>sub</li></ul></li></ul>')).toBe(
      '<ul><li><p>uno</p><ul><li><p>sub</p></li></ul></li></ul>'
    );
    expect(clean('<ol><li>uno</li><li><p>due</p><p>tre</p></li></ol>')).toBe(
      '<ol><li><p>uno</p></li><li><p>due</p><p>tre</p></li></ol>'
    );
  });

  it('una voce con grassetto, a capo e testo dopo arriva intera', () => {
    const md = htmlToArchiveMarkdown(cleanEditorIncomingHtml('<ol><li>П<strong>ри</strong><br>y</li></ol>').html);
    expect(storedToPlainText(md)).toBe('При\ny');
  });
});
