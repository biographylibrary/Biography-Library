import { describe, expect, it } from 'vitest';
import {
  archiveMarkdownToHtml,
  htmlToArchiveMarkdown,
  looksLikeStoredHtml,
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
    expect(looksLikeStoredHtml('## Title\n\nHello **world**.')).toBe(false);
    expect(storedToArchiveMarkdown('<p>Hi <strong>there</strong></p>')).toBe('Hi **there**');
    expect(storedToArchiveMarkdown('Hi **there**')).toBe('Hi **there**');
    expect(storedToPlainText('**bold** and *i*')).toBe('bold and i');
    expect(storedToPlainText('<p>Una vita.</p>')).toBe('Una vita.');
  });

  it('wraps legacy plain text as paragraphs', () => {
    const html = storedToSafeHtml('First paragraph.\n\nSecond paragraph.');
    expect(html).toContain('<p>First paragraph.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });
});
