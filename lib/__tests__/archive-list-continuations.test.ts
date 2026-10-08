// @vitest-environment jsdom
/**
 * Multi-paragraph list items and nested-list indentation (CommonMark).
 * Defects: listItemHeadAndNested glues paragraphs; nested lists use fixed 2-space indent.
 */
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  archiveMarkdownToHtml,
  htmlToArchiveMarkdown,
  storedToPlainText,
} from '@/lib/archive-markdown';
import {
  archiveMarkdownToEditorHtml,
  archiveTiptapExtensions,
} from '@/lib/editor-archive-tiptap';
import { editorLoadMatchesStored } from '@/lib/editor-load-guard';
import { handleArchivePasteEvent } from '@/lib/editor-paste';
import { nfc } from '@/lib/nfc';

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
  for (const proto of [
    Element.prototype as unknown as Record<string, unknown>,
    CharacterData.prototype as unknown as Record<string, unknown>,
    Range.prototype as unknown as Record<string, unknown>,
  ]) {
    proto.getClientRects = rectList;
    proto.getBoundingClientRect = () => emptyRect;
  }
});

const editors: Editor[] = [];

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

function createArchiveEditor(markdown: string) {
  const editor = new Editor({
    extensions: archiveTiptapExtensions(),
    content: archiveMarkdownToEditorHtml(markdown),
  });
  editors.push(editor);
  return editor;
}

function saveFromEditor(editor: Editor): string {
  return nfc(htmlToArchiveMarkdown(editor.getHTML()));
}

function docTextWithNewlines(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
}

function countNestedListsInHtml(html: string): { ol: number; ul: number; li: number } {
  return {
    ol: (html.match(/<ol\b/gi) ?? []).length,
    ul: (html.match(/<ul\b/gi) ?? []).length,
    li: (html.match(/<li\b/gi) ?? []).length,
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

describe('list item multi-paragraph serialization', () => {
  it('does not glue two paragraphs inside a bullet item', () => {
    const html =
      '<ul><li><p>1944. fu un anno</p><p>Prima riga</p><p>***</p><p>Seconda</p></li></ul>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).not.toContain('annoPrima');
    expect(md).not.toContain('riga***');
    expect(md).not.toContain('***Seconda');
    expect(storedToPlainText(md)).toContain('1944. fu un anno');
    expect(storedToPlainText(md)).toContain('Prima riga');
    expect(storedToPlainText(md)).toContain('***');
    expect(storedToPlainText(md)).toContain('Seconda');
    // Continuation paragraphs: blank line + indent matching "- " (2 spaces).
    expect(md).toMatch(/^- 1944\\\. fu un anno\n\n {2}Prima riga\n\n {2}\\\*\\\*\\\*\n\n {2}Seconda$/m);
  });

  it('indents continuations by ordered-marker width (3 for "1. ")', () => {
    const html = '<ol><li><p>uno</p><p>due</p><p>tre</p></li></ol>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).toMatch(/^1\. uno\n\n {3}due\n\n {3}tre$/m);
    expect(md).not.toContain('unodue');
  });

  it.each([
    ['1944. Fu', '1944\\. Fu'],
    ['1) non', '1\\) non'],
    ['# titolo', '\\# titolo'],
    ['- altro', '\\- altro'],
    ['+ più', '\\+ più'],
    ['> cit', '&gt; cit'],
    ['***', '\\*\\*\\*'],
    ['---', '\\-\\-\\-'],
  ])('protects continuation paragraph starting with %s', (raw, escapedInMd) => {
    const html = `<ul><li><p>testa</p><p>${esc(raw)}</p></li></ul>`;
    const md = htmlToArchiveMarkdown(html);
    expect(md).toContain(`  ${escapedInMd}`);
    expect(storedToPlainText(md)).toContain(raw === '> cit' ? '> cit' : raw);
    expect(archiveMarkdownToHtml(md)).toMatch(/<li>/);
    expect(archiveMarkdownToHtml(md)).not.toMatch(/<hr\b/i);
  });

  it('indents hard-break lines inside a continuation paragraph', () => {
    const html = '<ul><li><p>testa</p><p>riga uno  <br>riga due</p></li></ul>';
    const md = htmlToArchiveMarkdown(html);
    // First continuation line indented; line after hard break also indented.
    expect(md).toMatch(/^- testa\n\n {2}riga uno {2}\n {2}riga due$/m);
  });

  it('keeps nested list after continuation paragraphs', () => {
    const html =
      '<ul><li><p>testa</p><p>continua</p><ul><li><p>sotto</p></li></ul></li></ul>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).toMatch(/^- testa\n\n {2}continua\n {2}- sotto$/m);
    const out = archiveMarkdownToHtml(md);
    expect(countNestedListsInHtml(out)).toEqual({ ol: 0, ul: 2, li: 2 });
  });
});

describe('nested list indentation by parent marker width', () => {
  it('nests bullet under ordered with 3-space indent (not 2)', () => {
    const html =
      '<ol><li><p>uno</p><ul><li><p>sotto a</p></li><li><p>sotto b</p></li></ul></li><li><p>due</p></li></ol>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).toBe('1. uno\n   - sotto a\n   - sotto b\n2. due');
    const out = archiveMarkdownToHtml(md);
    // One ordered list with two items; nested ul inside first li — not three separate lists.
    expect(countNestedListsInHtml(out)).toEqual({ ol: 1, ul: 1, li: 4 });
    expect(out.indexOf('<ul>')).toBeGreaterThan(out.indexOf('<ol>'));
    expect(out).toMatch(/<ol>[\s\S]*<ul>[\s\S]*<\/ul>[\s\S]*<\/ol>/);
  });

  it('nests ordered under bullet with 2-space indent', () => {
    const html =
      '<ul><li><p>radice</p><ol><li><p>a</p></li><li><p>b</p></li></ol></li></ul>';
    const md = htmlToArchiveMarkdown(html);
    expect(md).toBe('- radice\n  1. a\n  2. b');
    const out = archiveMarkdownToHtml(md);
    expect(countNestedListsInHtml(out)).toEqual({ ol: 1, ul: 1, li: 3 });
  });

  it('nests three levels with marker-width indents', () => {
    const html =
      '<ol><li><p>L1</p><ul><li><p>L2</p><ol><li><p>L3</p></li></ol></li></ul></li></ol>';
    const md = htmlToArchiveMarkdown(html);
    // "1. " = 3 spaces under L1; "- " = 2 more under L2 → total 5 for L3 marker line.
    expect(md).toBe('1. L1\n   - L2\n     1. L3');
    const out = archiveMarkdownToHtml(md);
    expect(countNestedListsInHtml(out)).toEqual({ ol: 2, ul: 1, li: 3 });
  });

  it('indents nest under 10th ordered item by 4 spaces', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      i < 9
        ? `<li><p>v${i + 1}</p></li>`
        : `<li><p>v10</p><ul><li><p>sotto</p></li></ul></li>`
    ).join('');
    const md = htmlToArchiveMarkdown(`<ol>${items}</ol>`);
    expect(md).toContain('10. v10\n    - sotto');
    const out = archiveMarkdownToHtml(md);
    expect(out).toMatch(/<ol>[\s\S]*10[\s\S]*<ul>[\s\S]*sotto/);
  });
});

describe('editor round-trip (production extensions)', () => {
  it('multi-paragraph list item: structure and newlines survive save→load→save', () => {
    const html =
      '<ul><li><p>1944. fu un anno</p><p>Prima riga</p><p>***</p><p>Seconda</p></li></ul>';
    const first = nfc(htmlToArchiveMarkdown(html));
    const editor1 = createArchiveEditor(first);
    const text1 = docTextWithNewlines(editor1);
    expect(text1).toContain('1944. fu un anno');
    expect(text1).toContain('Prima riga');
    // Newlines separate paragraphs inside the item (guard's compressed plain would not).
    expect(text1.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(4);

    const mid = saveFromEditor(editor1);
    expect(mid).toBe(first);
    expect(editorLoadMatchesStored(first, editor1)).toBe(true);

    const editor2 = createArchiveEditor(mid);
    expect(docTextWithNewlines(editor2)).toBe(text1);
    expect(editorLoadMatchesStored(mid, editor2)).toBe(true);
    expect(saveFromEditor(editor2)).toBe(mid);
  });

  it('ordered with nested bullet: nest and numbering survive save→load→save', () => {
    const html =
      '<ol><li><p>uno</p><ul><li><p>sotto a</p></li><li><p>sotto b</p></li></ul></li><li><p>due</p></li></ol>';
    const first = nfc(htmlToArchiveMarkdown(html));
    const editor1 = createArchiveEditor(first);
    expect(editor1.getHTML()).toMatch(/<ol>[\s\S]*<ul>/);
    expect(docTextWithNewlines(editor1)).toContain('sotto a');
    const mid = saveFromEditor(editor1);
    expect(mid).toBe(first);
    expect(editorLoadMatchesStored(first, editor1)).toBe(true);
    const editor2 = createArchiveEditor(mid);
    expect(saveFromEditor(editor2)).toBe(mid);
  });
});

describe('plain paste of multiple paragraphs into a list item', () => {
  it('paste into a list item keeps paragraphs separate and round-trips', () => {
    // Empty list item (same container ProseMirror keeps for multi-paragraph paste).
    const editor = createArchiveEditor('- ');
    editor.commands.setContent('<ul><li><p></p></li></ul>');
    editor.commands.focus('start');

    const plain = 'prima\n\nseconda\n\n***';
    const dt = new DataTransfer();
    dt.setData('text/plain', plain);
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    } as any);
    const handled = handleArchivePasteEvent(editor.view, event);
    expect(handled).toBe(true);

    const first = saveFromEditor(editor);
    expect(storedToPlainText(first)).toContain('prima');
    expect(storedToPlainText(first)).toContain('seconda');
    expect(storedToPlainText(first)).toContain('***');
    expect(first).not.toMatch(/primaseconda|seconda\*\*\*/i);
    expect(first).toMatch(/^- prima\n\n {2}seconda\n\n {2}\\\*\\\*\\\*/m);

    expect(editorLoadMatchesStored(first, editor)).toBe(true);
    const editor2 = createArchiveEditor(first);
    expect(saveFromEditor(editor2)).toBe(first);
  });
});

describe('publication reader (archiveMarkdownToHtml / markdown-it)', () => {
  it('renders continuations as paragraphs of the same list item', () => {
    const md = '1. uno\n\n   due\n\n   tre';
    const html = archiveMarkdownToHtml(md);
    expect(countNestedListsInHtml(html)).toEqual({ ol: 1, ul: 0, li: 1 });
    expect(html).toMatch(/<li>[\s\S]*uno[\s\S]*due[\s\S]*tre[\s\S]*<\/li>/);
  });

  it('renders nested bullet under ordered as one tree', () => {
    const md = '1. uno\n   - sotto a\n   - sotto b\n2. due';
    const html = archiveMarkdownToHtml(md);
    expect(countNestedListsInHtml(html)).toEqual({ ol: 1, ul: 1, li: 4 });
  });
});

describe('marked (TipTap load path) and markdown-it agree on structure', () => {
  it('same list counts for continuation + nested cases', () => {
    const cases = [
      htmlToArchiveMarkdown(
        '<ul><li><p>a</p><p>b</p><p>***</p></li></ul>'
      ),
      htmlToArchiveMarkdown(
        '<ol><li><p>uno</p><ul><li><p>sotto a</p></li><li><p>sotto b</p></li></ul></li><li><p>due</p></li></ol>'
      ),
      htmlToArchiveMarkdown(
        '<ol><li><p>L1</p><ul><li><p>L2</p><ol><li><p>L3</p></li></ol></li></ul></li></ol>'
      ),
    ];
    for (const md of cases) {
      const viaMarkdownIt = archiveMarkdownToHtml(md);
      const editor = createArchiveEditor(md);
      const viaEditor = editor.getHTML();
      expect(countNestedListsInHtml(viaEditor)).toEqual(countNestedListsInHtml(viaMarkdownIt));
      expect(editorLoadMatchesStored(md, editor)).toBe(true);
    }
  });
});
