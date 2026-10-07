// @vitest-environment jsdom
/**
 * TipTap load/save with the same extension list as production.
 * Catches the Markdown contentType bug that drops blocks after a leading list.
 */
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  archiveMarkdownToEditorHtml,
  archiveTiptapExtensions,
} from '@/lib/editor-archive-tiptap';
import {
  htmlToArchiveMarkdown,
  looksLikeStoredHtml,
  normalizeArchiveMarkdown,
  storedToPlainText,
} from '@/lib/archive-markdown';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import {
  editorLoadMatchesStored,
  plainTextFromEditorDoc,
  plainTextFromStoredMarkdown,
} from '@/lib/editor-load-guard';
import { buildEditorSavePayload } from '@/lib/editor/write-payloads';
import { nfc } from '@/lib/nfc';

/** Production content from Giuseppe Pira (truncated shape; full patterns covered below). */
const GIUSEPPE_HEAD = `1. Introduzione

# per Generazione Più |  
Programma di educazione digitale e AI

### Proposta di percorsi, workshop e laboratori (versione 2, settembre 2026)

## 1. Perché questo programma, e perché in Ticino

Il Ticino è il cantone più anziano della Svizzera.

Tre frontiere restano aperte.

***

Dopo il separatore.`;

const editors: Editor[] = [];

function createArchiveEditor(markdown: string, opts?: { useBrokenMarkdownType?: boolean }) {
  const md = normalizeArchiveMarkdown(markdown);
  const editor = new Editor({
    extensions: archiveTiptapExtensions(),
    content: opts?.useBrokenMarkdownType ? md : archiveMarkdownToEditorHtml(md),
    ...(opts?.useBrokenMarkdownType ? { contentType: 'markdown' as const } : {}),
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

describe('TipTap archive editor load (production extensions)', () => {
  it('regression: contentType markdown drops text after a leading ordered list (documents the bug)', () => {
    const editor = createArchiveEditor(GIUSEPPE_HEAD, { useBrokenMarkdownType: true });
    expect(editor.state.doc.textContent).toBe('Introduzione');
    expect(editorLoadMatchesStored(GIUSEPPE_HEAD, editor)).toBe(false);
  });

  it('loads Giuseppe-shaped document fully via archive HTML path', () => {
    const editor = createArchiveEditor(GIUSEPPE_HEAD);
    const text = editor.state.doc.textContent;
    expect(text).toContain('Introduzione');
    expect(text).toContain('per Generazione Più');
    expect(text).toContain('Programma di educazione digitale e AI');
    expect(text).toContain('Proposta di percorsi');
    expect(text).toContain('Perché questo programma');
    expect(text).toContain('cantone più anziano');
    expect(text).toContain('Dopo il separatore');
    expect(editorLoadMatchesStored(GIUSEPPE_HEAD, editor)).toBe(true);

    const saved = nfc(htmlToArchiveMarkdown(editor.getHTML()));
    expect(plainTextFromStoredMarkdown(saved)).toBe(plainTextFromStoredMarkdown(GIUSEPPE_HEAD));
  });

  it('loads ordered list then headings and paragraphs', () => {
    const md = `1. Primo

## Titolo

Paragrafo uno.

### Sottotitolo

Paragrafo due.`;
    const editor = createArchiveEditor(md);
    expect(editor.state.doc.textContent).toContain('Paragrafo due');
    expect(editorLoadMatchesStored(md, editor)).toBe(true);
  });

  it('loads list followed by a long prose block', () => {
    const long = 'Parola '.repeat(200).trim();
    const md = `1. Introduzione

${long}`;
    const editor = createArchiveEditor(md);
    expect(plainTextFromEditorDoc(editor)).toContain('Parola');
    expect(editorLoadMatchesStored(md, editor)).toBe(true);
  });

  it('loads h1 h2 h3 and scene separator', () => {
    const md = `# Uno

## Due

### Tre

***

Dopo.`;
    const editor = createArchiveEditor(md);
    const html = editor.getHTML();
    expect(html).toContain('<h1>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<h3>');
    expect(html).toContain('<hr');
    expect(editor.state.doc.textContent).toContain('Dopo');
    expect(editorLoadMatchesStored(md, editor)).toBe(true);
  });

  it('digit → paste → save → reload round-trip keeps author text', () => {
    const editor = createArchiveEditor('');
    editor.commands.setContent('<ol><li><p>Introduzione</p></li></ol>');
    const pasted = cleanEditorIncomingHtml(
      '<h2>Titolo incollato</h2><p>Corpo del testo incollato con <strong>grassetto</strong>.</p>'
    );
    editor.commands.insertContent(pasted.html);
    const saved = nfc(htmlToArchiveMarkdown(editor.getHTML()));
    expect(saved).toContain('Introduzione');
    expect(saved).toContain('Titolo incollato');
    expect(saved).toContain('Corpo del testo');

    const reloaded = createArchiveEditor(saved);
    expect(editorLoadMatchesStored(saved, reloaded)).toBe(true);
    expect(plainTextFromEditorDoc(reloaded)).toBe(plainTextFromStoredMarkdown(saved));
  });

  it('load guard: truncated editor document fails the plain-text check', () => {
    const full = `1. Introduzione

## Restante

Testo lungo che non deve sparire.`;
    const truncated = createArchiveEditor(full, { useBrokenMarkdownType: true });
    expect(editorLoadMatchesStored(full, truncated)).toBe(false);
    expect(plainTextFromStoredMarkdown(full)).toContain('Restante');
    expect(plainTextFromEditorDoc(truncated)).toBe('Introduzione');
  });
});

describe('paste tables and autolink off', () => {
  it('flattens an HTML table to one paragraph per cell in reading order', () => {
    const html = `
      <table>
        <tr><th>Frontiera</th><th>Evidenza</th></tr>
        <tr><td>L'età molto avanzata</td><td>La soglia degli offliner</td></tr>
      </table>`;
    const cleaned = cleanEditorIncomingHtml(html);
    expect(cleaned.warnings).toContain('tables');
    expect(cleaned.markdown).toMatch(/Frontiera\n\nEvidenza/);
    expect(cleaned.markdown).toMatch(/L'età molto avanzata\n\nLa soglia/);
    expect(cleaned.markdown).not.toMatch(/FrontieraEvidenza/);
    expect(cleaned.html).toMatch(/<p>Frontiera<\/p>\s*<p>Evidenza<\/p>/);

    const editor = createArchiveEditor('');
    editor.commands.setContent(cleaned.html);
    const text = editor.state.doc.textContent;
    expect(text).toContain('Frontiera');
    expect(text).toContain('Evidenza');
    expect(text).toContain("L'età molto avanzata");
  });

  it('does not autolink prose that looks like a host name', () => {
    for (const sample of ['fine.Poi', 'consumo.La', 'www.esempio.ch']) {
      const md = `Testo con ${sample} in mezzo.`;
      const editor = createArchiveEditor(md);
      const html = editor.getHTML();
      expect(html).not.toMatch(/<a\b/i);
      expect(editor.state.doc.textContent).toContain(sample);
      // Save must not invent a markdown link.
      const saved = htmlToArchiveMarkdown(html);
      expect(saved).not.toMatch(/\]\(https?:\/\//);
      expect(storedToPlainText(saved)).toContain(sample);
    }
  });

  it('still allows an explicit https link already in Markdown', () => {
    const md = 'Vedi [sito](https://esempio.ch/path).';
    const editor = createArchiveEditor(md);
    expect(editor.getHTML()).toMatch(/<a\b[^>]*href="https:\/\/esempio\.ch\/path"/);
  });
});

describe('legacy HTML detection must not rewrite Markdown with angle brackets', () => {
  /** Forms that previously matched HTML_MARKERS mid-string and could truncate on save. */
  const riskyMarkdown = [
    '\\<b>x\\</b>',
    '\\<i>x\\</i>',
    'se x<a y allora',
    '<3',
    'a < b',
    'il tag <p> serve per i paragrafi',
    'contattami <nome@esempio.ch>',
  ];

  function saveFreeflow(content: string): string {
    const payload = buildEditorSavePayload({
      fields: { content_freeflow: content },
      isMemorial: false,
      visibility: 'private',
      biographyMode: 'autobiography',
    });
    return payload.content_freeflow as string;
  }

  function saveFromEditorHtml(html: string): string {
    return saveFreeflow(nfc(htmlToArchiveMarkdown(html)));
  }

  it.each(riskyMarkdown)(
    'save path leaves risky Markdown %j intact (no HTML conversion)',
    (sample) => {
      expect(looksLikeStoredHtml(sample)).toBe(false);
      const firstSave = saveFreeflow(sample);
      expect(firstSave).toBe(sample);
      const secondSave = saveFreeflow(firstSave);
      expect(secondSave).toBe(firstSave);
      // Former bug: "se x<a y allora" → "se x"; escaped tags split into paragraphs.
      expect(storedToPlainText(firstSave)).toContain(
        sample.replace(/\\</g, '<').replace(/\\>/g, '>')
      );
    }
  );

  it.each([
    { label: 'typed bold tags', html: '<p>&lt;b&gt;x&lt;/b&gt;</p>', plain: '<b>x</b>' },
    { label: 'typed italic tags', html: '<p>&lt;i&gt;x&lt;/i&gt;</p>', plain: '<i>x</i>' },
    { label: 'less-than mid sentence', html: '<p>se x&lt;a y allora</p>', plain: 'se x<a y allora' },
    { label: 'heart less-than', html: '<p>&lt;3</p>', plain: '<3' },
    { label: 'compare a < b', html: '<p>a &lt; b</p>', plain: 'a < b' },
    {
      label: 'talking about p tags',
      html: '<p>il tag &lt;p&gt; serve per i paragrafi</p>',
      plain: 'il tag <p> serve per i paragrafi',
    },
    {
      label: 'angle-bracket address',
      html: '<p>contattami &lt;nome@esempio.ch&gt;</p>',
      plain: 'contattami <nome@esempio.ch>',
    },
  ])(
    'editor save → load → guard → save again is stable ($label)',
    ({ html, plain }) => {
      const firstSave = saveFromEditorHtml(html);
      expect(looksLikeStoredHtml(firstSave)).toBe(false);
      expect(storedToPlainText(firstSave)).toBe(plain);

      const editor = createArchiveEditor(firstSave);
      expect(editorLoadMatchesStored(firstSave, editor)).toBe(true);
      expect(plainTextFromEditorDoc(editor)).toBe(plainTextFromStoredMarkdown(firstSave));

      const secondSave = saveFromEditorHtml(editor.getHTML());
      expect(secondSave).toBe(firstSave);
    }
  );

  it('still converts real legacy HTML originals that start with a block tag', () => {
    const legacy = '<p>Ciao <strong>mondo</strong></p>';
    expect(looksLikeStoredHtml(legacy)).toBe(true);
    const firstSave = saveFreeflow(legacy);
    expect(firstSave).toBe('Ciao **mondo**');
    const editor = createArchiveEditor(firstSave);
    expect(editorLoadMatchesStored(firstSave, editor)).toBe(true);
    const secondSave = saveFromEditorHtml(editor.getHTML());
    expect(secondSave).toBe(firstSave);
  });
});

