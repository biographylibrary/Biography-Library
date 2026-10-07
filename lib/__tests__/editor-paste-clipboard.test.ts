// @vitest-environment jsdom
/**
 * Paste path that production uses: ClipboardEvent → handlePaste / pasteHTML,
 * not a direct call to cleanEditorIncomingHtml alone.
 */
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import { handleArchivePasteEvent, decideArchivePaste } from '@/lib/editor-paste';
import { htmlToArchiveMarkdown } from '@/lib/archive-markdown';

beforeAll(() => {
  if (typeof globalThis.ClipboardEvent === 'undefined') {
    class ClipboardEventPolyfill extends Event {
      clipboardData: DataTransfer | null;
      constructor(type: string, init: any = {}) {
        super(type, init);
        this.clipboardData = init.clipboardData ?? null;
      }
    }
    (globalThis as any).ClipboardEvent = ClipboardEventPolyfill;
  }
  if (typeof globalThis.DataTransfer === 'undefined') {
    class DataTransferPolyfill {
      private data = new Map<string, string>();
      types: string[] = [];
      setData(format: string, value: string) {
        this.data.set(format, value);
        if (!this.types.includes(format)) this.types.push(format);
      }
      getData(format: string) {
        return this.data.get(format) ?? '';
      }
    }
    (globalThis as any).DataTransfer = DataTransferPolyfill;
  }
  const emptyRect = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {},
  };
  const rectList = () => [emptyRect] as unknown as DOMRectList;
  // ProseMirror coordsAtPos calls getClientRects on Element/Text/Range targets.
  for (const proto of [
    Element.prototype as unknown as Record<string, unknown>,
    CharacterData.prototype as unknown as Record<string, unknown>,
    Range.prototype as unknown as Record<string, unknown>,
  ]) {
    proto.getClientRects = rectList;
    proto.getBoundingClientRect = () => emptyRect;
  }
});

const WORD_TABLE_HTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"><body>
<!--StartFragment-->
<table class="MsoNormalTable" border="1">
 <tr>
  <td><p class="MsoNormal"><b><span lang="IT">Frontiera</span></b><o:p></o:p></p></td>
  <td><p class="MsoNormal"><b><span lang="IT">Evidenza</span></b><o:p></o:p></p></td>
 </tr>
 <tr>
  <td><p class="MsoNormal"><span lang="IT">L'età molto avanzata</span><o:p></o:p></p></td>
  <td><p class="MsoNormal"><span lang="IT">La soglia degli "offliner"</span><o:p></o:p></p></td>
 </tr>
</table>
<!--EndFragment-->
</body></html>`;

/** Flattened HTML Word sometimes puts in text/html while TSV stays in text/plain. */
const WORD_FLAT_HTML = `<html><body><!--StartFragment-->
<p class="MsoNormal"><span lang="IT">FrontieraEvidenzaL'età molto avanzataLa soglia degli "offliner"</span></p>
<!--EndFragment--></body></html>`;

const WORD_PLAIN_TSV = `Frontiera\tEvidenza\nL'età molto avanzata\tLa soglia degli "offliner"`;

const GDOCS_TABLE_HTML = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-x"><table><tr><td><p>Frontiera</p></td><td><p>Evidenza</p></td></tr><tr><td><p>L'età molto avanzata</p></td><td><p>La soglia</p></td></tr></table></b>`;

const WEB_TABLE_HTML = `<table><thead><tr><th>Frontiera</th><th>Evidenza</th></tr></thead><tbody><tr><td>L'età molto avanzata</td><td>La soglia</td></tr></tbody></table>`;

const editors: Editor[] = [];
const warningsLog: string[][] = [];

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  warningsLog.length = 0;
});

function makeEditor() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const editor = new Editor({
    element: el,
    extensions: archiveTiptapExtensions(),
    content: '<p></p>',
    editorProps: {
      handlePaste(view, event) {
        return handleArchivePasteEvent(view, event, (w) => {
          warningsLog.push(w);
        });
      },
      transformPastedHTML(html) {
        const cleaned = cleanEditorIncomingHtml(html);
        if (cleaned.warnings.length) warningsLog.push(cleaned.warnings);
        return cleaned.html;
      },
    },
  });
  editors.push(editor);
  return editor;
}

function pasteClipboard(editor: Editor, html: string, plain: string) {
  const dt = new DataTransfer();
  if (html) dt.setData('text/html', html);
  if (plain) dt.setData('text/plain', plain);
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  } as any);
  editor.view.focus();
  const handled = handleArchivePasteEvent(editor.view, event, (w) => warningsLog.push(w));
  if (!handled) {
    // Fallback mirrors TipTap when handlePaste returns false: cleaned HTML or plain.
    const cleaned = html
      ? cleanEditorIncomingHtml(html)
      : cleanEditorIncomingHtml(`<p>${plain.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`);
    if (cleaned.warnings.length) warningsLog.push(cleaned.warnings);
    editor.commands.insertContent(cleaned.html || `<p>${plain}</p>`);
  }
  return htmlToArchiveMarkdown(editor.getHTML());
}

describe('archive clipboard paste (real path)', () => {
  it('pasted h1–h6 inside a wrapper div stay headings (not paragraphs)', () => {
    const editor = makeEditor();
    const html = `<div class="WordSection1">
      <h1><b><span>Titolo uno</span></b></h1>
      <h2>Titolo due</h2>
      <h3>Titolo tre</h3>
      <h4>Titolo quattro</h4>
      <p>corpo</p>
    </div>`;
    const md = pasteClipboard(editor, html, 'Titolo uno');
    expect(md).toMatch(/^# Titolo uno/m);
    expect(md).toMatch(/^## Titolo due/m);
    expect(md).toMatch(/^### Titolo tre/m);
    expect(md).toMatch(/^### Titolo quattro/m);
    // Style-bold on the whole heading must not become **…**
    expect(md).not.toMatch(/^# \*\*/m);
    expect(editor.getHTML()).toMatch(/<h1>Titolo uno<\/h1>/);
    expect(editor.getHTML()).not.toMatch(/<h1><strong>/);
  });

  it('Word MsoListParagraph → real bullet/ordered lists; glyph fallback', () => {
    const editor = makeEditor();
    const wordLists = `<html><body>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· Uno</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· Due</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">1. Primo</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">2. Secondo</p>
      <p>• Pallino</p>
      <p>a) Lettera</p>
    </body></html>`;
    const md = pasteClipboard(editor, wordLists, 'Uno');
    expect(md).toMatch(/^- Uno/m);
    expect(md).toMatch(/^- Due/m);
    expect(md).toMatch(/^1\. Primo/m);
    expect(md).toMatch(/^2\. Secondo/m);
    expect(md).toMatch(/^- Pallino/m);
    expect(md).toMatch(/^1\. Lettera/m);
    expect(md).not.toContain('· Uno');
    expect(editor.getHTML()).toMatch(/<ul>/);
    expect(editor.getHTML()).toMatch(/<ol>/);
  });

  it('div blocks without spaces stay separate paragraphs', () => {
    const editor = makeEditor();
    const html = `<div><div>Alpha</div><div>Beta</div></div>`;
    const md = pasteClipboard(editor, html, 'AlphaBeta');
    expect(md).toBe('Alpha\n\nBeta');
    expect(md).not.toContain('AlphaBeta');
  });

  it('Word HTML table → one paragraph per cell + warning', () => {
    const editor = makeEditor();
    const md = pasteClipboard(editor, WORD_TABLE_HTML, WORD_PLAIN_TSV);
    expect(md).toMatch(/Frontiera\n\nEvidenza/);
    expect(md).toMatch(/L'età molto avanzata\n\nLa soglia/);
    expect(md).not.toMatch(/FrontieraEvidenza/);
    expect(warningsLog.flat()).toContain('tables');
  });

  it('Word flattened HTML + TSV plain → uses TSV separators (production bug)', () => {
    // Without decideArchivePaste preferring TSV, this stays glued.
    const glued = decideArchivePaste(WORD_FLAT_HTML, WORD_PLAIN_TSV);
    expect(glued).not.toBeNull();
    expect(glued!.html).toContain('<p>Frontiera</p>');
    expect(glued!.html).toContain('<p>Evidenza</p>');
    expect(glued!.warnings).toContain('tables');

    const editor = makeEditor();
    const md = pasteClipboard(editor, WORD_FLAT_HTML, WORD_PLAIN_TSV);
    expect(md).toMatch(/Frontiera\n\nEvidenza/);
    expect(md).not.toContain('FrontieraEvidenza');
    expect(warningsLog.flat()).toContain('tables');
  });

  it('Google Docs table HTML → separate cells', () => {
    const editor = makeEditor();
    const md = pasteClipboard(editor, GDOCS_TABLE_HTML, 'Frontiera\tEvidenza');
    expect(md).toMatch(/Frontiera\n\nEvidenza/);
    expect(md).not.toMatch(/FrontieraEvidenza/);
    expect(warningsLog.flat()).toContain('tables');
  });

  it('web page table HTML → separate cells', () => {
    const editor = makeEditor();
    const md = pasteClipboard(editor, WEB_TABLE_HTML, 'Frontiera Evidenza');
    expect(md).toMatch(/Frontiera\n\nEvidenza/);
    expect(md).toMatch(/L'età molto avanzata\n\nLa soglia/);
    expect(warningsLog.flat()).toContain('tables');
  });

  it('web table with bare td/th and nested p cells never glues words', () => {
    const editor = makeEditor();
    const html = `<table>
      <thead><tr><th>A1</th><th>B1</th></tr></thead>
      <tbody>
        <tr><td>A2</td><td><p>B2a</p><p>B2b</p></td></tr>
      </tbody>
    </table>`;
    const md = pasteClipboard(editor, html, 'A1');
    expect(md).toMatch(/A1\n\nB1/);
    expect(md).toMatch(/A2\n\nB2a\n\nB2b/);
    expect(md).not.toMatch(/A1B1|A2B2|B2aB2b/);
  });
});


describe('no automatic links (editor instance)', () => {
  it('Link extension has autolink and paste auto-link disabled', () => {
    const editor = makeEditor();
    const link = editor.extensionManager.extensions.find((e) => e.name === 'link');
    expect(link).toBeTruthy();
    expect(link!.options.autolink).toBe(false);
    expect(link!.options.linkOnPaste).toBe(false);
    expect(link!.options.shouldAutoLink('consumo.La')).toBe(false);
    expect(link!.options.shouldAutoLink('http://esempio.ch')).toBe(false);
  });

  it('typing/pasting prose-like hosts does not create <a>', async () => {
    const { archiveMarkdownToEditorHtml } = await import('@/lib/editor-archive-tiptap');
    for (const sample of ['consumo.La', 'fine.Poi', 'www.esempio.ch', 'http://esempio.ch']) {
      const editor = makeEditor();
      // Simulate real typing: insert + trailing space (when TipTap autolink would fire).
      editor.commands.setContent('<p></p>');
      editor.commands.insertContent(`${sample} `);
      expect(editor.getHTML()).not.toMatch(/<a\b/i);

      const pasted = makeEditor();
      pasteClipboard(pasted, '', sample);
      expect(pasted.getHTML()).not.toMatch(/<a\b/i);

      editor.commands.setContent(`<p>Testo ${sample} fine.</p>`);
      expect(editor.getHTML()).not.toMatch(/<a\b/i);
      const saved = htmlToArchiveMarkdown(editor.getHTML());
      expect(saved).not.toMatch(/\]\(https?:\/\//);
      expect(saved).toContain(sample);

      const reloaded = makeEditor();
      reloaded.commands.setContent(archiveMarkdownToEditorHtml(saved));
      expect(htmlToArchiveMarkdown(reloaded.getHTML())).not.toMatch(/\]\(https?:\/\//);
      expect(reloaded.getHTML()).not.toMatch(/<a\b/i);
    }
  });

  it('explicit setLink survives save/reload; javascript: rejected by serializer', async () => {
    const { archiveMarkdownToEditorHtml } = await import('@/lib/editor-archive-tiptap');
    const editor = makeEditor();
    editor.commands.setContent('<p><a href="https://esempio.ch/path">sito</a></p>');
    const saved = htmlToArchiveMarkdown(editor.getHTML());
    expect(saved).toContain('[sito](https://esempio.ch/path)');

    const reloaded = makeEditor();
    reloaded.commands.setContent(archiveMarkdownToEditorHtml(saved));
    expect(reloaded.getHTML()).toMatch(/href="https:\/\/esempio\.ch\/path"/);

    const bad = makeEditor();
    bad.commands.setContent('<p><a href="javascript:alert(1)">x</a></p>');
    expect(htmlToArchiveMarkdown(bad.getHTML())).not.toContain('javascript:');
  });

  it('load→save→load leaves plain consumo.La unchanged', async () => {
    const { archiveMarkdownToEditorHtml } = await import('@/lib/editor-archive-tiptap');
    const original = 'Il problema è il consumo.La sicurezza resta aperta.';
    const editor = makeEditor();
    editor.commands.setContent(archiveMarkdownToEditorHtml(original));
    const mid = htmlToArchiveMarkdown(editor.getHTML());
    const again = makeEditor();
    again.commands.setContent(archiveMarkdownToEditorHtml(mid));
    const final = htmlToArchiveMarkdown(again.getHTML());
    expect(final).toContain('consumo.La');
    expect(final).not.toMatch(/\[consumo\.La\]\(/);
    expect(mid).toBe(final);
  });
});
