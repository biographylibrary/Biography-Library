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
