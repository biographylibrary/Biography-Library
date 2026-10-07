// @vitest-environment jsdom
/**
 * Paste path that production uses: ClipboardEvent → handlePaste / pasteHTML,
 * not a direct call to cleanEditorIncomingHtml alone.
 */
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  archiveMarkdownToEditorHtml,
  archiveTiptapExtensions,
} from '@/lib/editor-archive-tiptap';
import { cleanEditorIncomingHtml } from '@/lib/editor-content-clean';
import { handleArchivePasteEvent, decideArchivePaste } from '@/lib/editor-paste';
import { htmlToArchiveMarkdown, storedToPlainText } from '@/lib/archive-markdown';
import { editorLoadMatchesStored } from '@/lib/editor-load-guard';
import { nfc } from '@/lib/nfc';

function escapeForHtmlFixture(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
    // Fallback mirrors TipTap when handlePaste returns false: cleaned HTML path only.
    // Plain-only must be handled by handleArchivePasteEvent (never TipTap Markdown).
    if (!html) {
      throw new Error('plain-only paste was not handled by handleArchivePasteEvent');
    }
    const cleaned = cleanEditorIncomingHtml(html);
    if (cleaned.warnings.length) warningsLog.push(cleaned.warnings);
    editor.commands.insertContent(cleaned.html || `<p>${plain}</p>`);
  }
  return htmlToArchiveMarkdown(editor.getHTML());
}

describe('archive clipboard paste (real path)', () => {
  it('pasted h1–h6 become normal paragraphs; style-bold on the title is stripped', () => {
    const editor = makeEditor();
    const html = `<div class="WordSection1">
      <h1><b><span>Capitolo uno</span></b></h1>
      <h2>Titolo due</h2>
      <h3>Titolo tre</h3>
      <h4>Titolo quattro</h4>
      <p>corpo</p>
    </div>`;
    const md = pasteClipboard(editor, html, 'Capitolo uno');
    expect(md).toContain('Capitolo uno');
    expect(md).toContain('Titolo due');
    expect(md).toContain('Titolo tre');
    expect(md).toContain('Titolo quattro');
    expect(md).toContain('corpo');
    // Not Markdown headings and not bold-wrapped title text.
    expect(md).not.toMatch(/^#/m);
    expect(md).not.toContain('**Capitolo uno**');
    expect(editor.getHTML()).not.toMatch(/<h[1-6]\b/i);
    expect(editor.getHTML()).toMatch(/<p>Capitolo uno<\/p>/);
  });

  it('Word MsoListParagraph → real bullet/ordered lists; safe glyphs without mso-list', () => {
    const editor = makeEditor();
    const wordLists = `<html><body>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· Uno</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· Due</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">1. Primo</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">2. Secondo</p>
      <p class="MsoListParagraph" style="mso-list:l2 level1 lfo3">o Terzo</p>
      <p>• Pallino</p>
      <p>§ Sezione</p>
      <p>a) Lettera</p>
    </body></html>`;
    const md = pasteClipboard(editor, wordLists, 'Uno');
    expect(md).toMatch(/^- Uno/m);
    expect(md).toMatch(/^- Due/m);
    expect(md).toMatch(/^1\. Primo/m);
    expect(md).toMatch(/^2\. Secondo/m);
    expect(md).toMatch(/^- Terzo/m);
    expect(md).toMatch(/^- Pallino/m);
    expect(md).toMatch(/^- Sezione/m);
    // Without mso-list, "a) Lettera" must stay intact.
    expect(md).toContain('a) Lettera');
    expect(md).not.toMatch(/^1\. Lettera/m);
    expect(md).not.toContain('· Uno');
    expect(editor.getHTML()).toMatch(/<ul>/);
    expect(editor.getHTML()).toMatch(/<ol>/);
  });

  it.each([
    'G. Verdi nacque a Busseto nel 1813.',
    'E. Montale scrisse...',
    'o forse no, rispose lei.',
    '1944. Fu l\'anno della svolta.',
    'a) Lettera semplice',
  ])('prose that looks like a list marker keeps every word: %s', (sample) => {
    const editor = makeEditor();
    const asHtml = pasteClipboard(editor, `<p>${sample}</p>`, sample);
    expect(storedToPlainText(asHtml)).toBe(sample);
    expect(asHtml).not.toMatch(/^- /m);
    // Must not become a numbered list that drops the leading token ("G.", "1944.", "a)").
    expect(storedToPlainText(asHtml)).toContain(sample.slice(0, 3));

    const plainEditor = makeEditor();
    const asPlain = pasteClipboard(plainEditor, '', sample);
    expect(storedToPlainText(asPlain)).toBe(sample);
  });

  it('common prose paragraphs keep every word; only · • § may become list markers', () => {
    const samples = [
      'G. Verdi nacque a Busseto nel 1813.',
      'E. Montale scrisse Ossi di seppia.',
      'o forse no, rispose lei.',
      'a casa sua c\'era un pianoforte.',
      '1944. Fu l\'anno della svolta.',
      '3) non è un elenco',
      'A. Einstein e la relatività.',
      '(1) nota tra parentesi all\'inizio',
      '• vero pallino',
      '· vero punto mediano',
      '§ vero paragrafo',
    ];
    const html = samples.map((s) => `<p>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('');
    const cleaned = cleanEditorIncomingHtml(html);
    const plain = storedToPlainText(cleaned.markdown);
    for (const s of samples) {
      if (/^[·•§]\s/.test(s)) {
        const body = s.replace(/^[·•§]\s+/, '');
        expect(plain).toContain(body);
        expect(cleaned.markdown).toMatch(new RegExp(`^- ${body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
      } else {
        expect(plain).toContain(s);
      }
    }
    expect(plain).toContain('G. Verdi');
    expect(plain).toContain('o forse no');
    expect(plain).toContain('1944.');
    expect(plain).toContain('3) non è un elenco');
    expect(plain).toContain('A. Einstein');
  });

  it('div blocks without spaces stay separate paragraphs', () => {
    const editor = makeEditor();
    const html = `<div><div>Alpha</div><div>Beta</div></div>`;
    const md = pasteClipboard(editor, html, 'AlphaBeta');
    expect(md).toBe('Alpha\n\nBeta');
    expect(md).not.toContain('AlphaBeta');
  });

  describe('author angle brackets and entities stay literal on paste', () => {
    const samples = [
      'il tag <p> serve per i paragrafi',
      'se x<a y allora',
      'scrivi a <mario@esempio.it> subito',
      '3 < 5 e 7 > 2',
      'AT&amp;T',
    ];

    function wrappers(sample: string): Array<{ label: string; html: string }> {
      const e = escapeForHtmlFixture(sample);
      return [
        { label: 'paragraph', html: `<p>${e}</p>` },
        { label: 'table cell', html: `<table><tr><td>${e}</td></tr></table>` },
        { label: 'list item', html: `<ul><li><p>${e}</p></li></ul>` },
        { label: 'bold', html: `<p><strong>${e}</strong></p>` },
      ];
    }

    it.each(samples)('HTML paste keeps every word and is stable on re-save for %j', (sample) => {
      for (const { label, html } of wrappers(sample)) {
        const editor = makeEditor();
        const first = pasteClipboard(editor, html, sample);
        expect(storedToPlainText(first), label).toBe(sample);

        // Second save from the editor document must match the first.
        const second = nfc(htmlToArchiveMarkdown(editor.getHTML()));
        expect(second, label).toBe(first);
      }
    });

    it.each(samples)('plain-text paste keeps every word and is stable on re-save for %j', (sample) => {
      const editor = makeEditor();
      const first = pasteClipboard(editor, '', sample);
      expect(storedToPlainText(first)).toBe(sample);
      const second = nfc(htmlToArchiveMarkdown(editor.getHTML()));
      expect(second).toBe(first);
    });
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


describe('plain-only paste stays literal (no TipTap Markdown)', () => {
  const samples = [
    '*x*',
    '**x**',
    '_x_',
    '5 * 3 * 2',
    'nota*',
    'a_b_c',
    '***',
    '# non titolo',
    '1. non elenco',
    '- non elenco',
    '> non citazione',
    'il tag <p> serve',
    'se x<a y allora',
    'scrivi a <mario@esempio.it>',
    'AT&amp;T',
  ];

  it('decideArchivePaste handles plain-only and leaves HTML paste to TipTap', () => {
    const plain = decideArchivePaste('', '5 * 3 * 2');
    expect(plain).not.toBeNull();
    expect(plain!.html).toContain('5 * 3 * 2');
    expect(plain!.html).not.toMatch(/<em>|<strong>/i);

    // HTML present (non-table) → null so transformPastedHTML runs unchanged.
    expect(decideArchivePaste('<p>ciao <em>x</em></p>', 'ciao x')).toBeNull();
  });

  it.each(samples)(
    'plain-only paste keeps text, stays editable, second save stable: %j',
    (sample) => {
      const editor = makeEditor();
      expect(editor.isEditable).toBe(true);
      const first = pasteClipboard(editor, '', sample);
      expect(editor.getHTML()).not.toMatch(/<em>|<strong>/i);
      expect(storedToPlainText(first)).toBe(sample);

      const second = nfc(htmlToArchiveMarkdown(editor.getHTML()));
      expect(second).toBe(first);

      const reloaded = makeEditor();
      reloaded.commands.setContent(archiveMarkdownToEditorHtml(first));
      expect(editorLoadMatchesStored(first, reloaded)).toBe(true);
      expect(reloaded.isEditable).toBe(true);
    }
  );

  it('plain paste mid-sentence keeps surrounding text and literal markers', () => {
    const editor = makeEditor();
    editor.commands.setContent('<p>AaaBbb</p>');
    let pos = 0;
    editor.state.doc.descendants((node, p) => {
      if (node.isText && node.text === 'AaaBbb') {
        pos = p + 3; // after "Aaa"
        return false;
      }
    });
    editor.commands.setTextSelection(pos);
    pasteClipboard(editor, '', '5 * 3 * 2');
    const saved = nfc(htmlToArchiveMarkdown(editor.getHTML()));
    expect(storedToPlainText(saved)).toBe('Aaa5 * 3 * 2Bbb');
    expect(editor.getHTML()).not.toMatch(/<em>/i);
    expect(editorLoadMatchesStored(saved, editor)).toBe(true);
  });

  it('plain paste inside a list item stays literal', () => {
    const editor = makeEditor();
    editor.commands.setContent('<ul><li><p>voce</p></li></ul>');
    let pos = 0;
    editor.state.doc.descendants((node, p) => {
      if (node.isText && node.text === 'voce') {
        pos = p + node.nodeSize; // end of "voce"
        return false;
      }
    });
    editor.commands.setTextSelection(pos);
    pasteClipboard(editor, '', '**x**');
    const saved = nfc(htmlToArchiveMarkdown(editor.getHTML()));
    expect(storedToPlainText(saved)).toContain('voce**x**');
    expect(editor.getHTML()).not.toMatch(/<strong>/i);
    expect(editorLoadMatchesStored(saved, editor)).toBe(true);
  });

  it('plain paste inside a heading stays literal', () => {
    const editor = makeEditor();
    editor.commands.setContent('<h2>Titolo</h2>');
    let pos = 0;
    editor.state.doc.descendants((node, p) => {
      if (node.isText && node.text === 'Titolo') {
        pos = p + node.nodeSize;
        return false;
      }
    });
    editor.commands.setTextSelection(pos);
    pasteClipboard(editor, '', '_x_');
    const saved = nfc(htmlToArchiveMarkdown(editor.getHTML()));
    expect(storedToPlainText(saved)).toContain('Titolo_x_');
    expect(editor.getHTML()).not.toMatch(/<em>/i);
    expect(editorLoadMatchesStored(saved, editor)).toBe(true);
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
