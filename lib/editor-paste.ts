/**
 * Real clipboard paste for the archive editor.
 * Word often puts a flattened paragraph in text/html and a TSV table in text/plain;
 * transformPastedHTML alone never sees the separators in that case.
 */
import { DOMParser as PmDOMParser } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import {
  cleanEditorIncomingHtml,
  cleanEditorIncomingPlainText,
  type ContentCleanWarning,
} from '@/lib/editor-content-clean';

export type ArchivePasteDecision = {
  html: string;
  warnings: ContentCleanWarning[];
};

/** Tab-separated rows → one paragraph per cell, reading order. */
export function cleanEditorIncomingTsvTable(plain: string): {
  html: string;
  markdown: string;
  warnings: ContentCleanWarning[];
} {
  const lines = (plain ?? '').replace(/\r\n/g, '\n').split('\n');
  const cells: string[] = [];
  for (const line of lines) {
    if (!line.includes('\t')) {
      const t = line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (t && cells.length > 0) cells.push(t);
      continue;
    }
    for (const cell of line.split('\t')) {
      const t = cell.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) cells.push(t);
    }
  }
  if (cells.length < 2) {
    return cleanEditorIncomingPlainText(plain);
  }
  const escaped = cells.map((c) =>
    c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  );
  const html = escaped.map((c) => `<p>${c}</p>`).join('');
  return {
    html,
    markdown: escaped.join('\n\n'),
    warnings: ['tables'],
  };
}

export function looksLikeTsvTable(plain: string): boolean {
  const lines = (plain ?? '').replace(/\r\n/g, '\n').split('\n');
  return lines.some((line) => line.split('\t').filter((c) => c.trim()).length >= 2);
}

/**
 * Choose HTML to insert from clipboard payloads.
 * Prefer real HTML tables; if HTML has no <table> but plain is TSV, use TSV
 * (Word / some browsers flatten tables in text/html).
 * Plain-only paste (no text/html): never hand off to TipTap Markdown — * _ stay literal.
 */
export function decideArchivePaste(html: string, plain: string): ArchivePasteDecision | null {
  const hasHtmlTable = /<table\b/i.test(html ?? '');
  if (hasHtmlTable) {
    const cleaned = cleanEditorIncomingHtml(html);
    if (!cleaned.html.trim()) return null;
    return { html: cleaned.html, warnings: cleaned.warnings };
  }
  if (looksLikeTsvTable(plain ?? '')) {
    const cleaned = cleanEditorIncomingTsvTable(plain);
    if (!cleaned.html.trim()) return null;
    return { html: cleaned.html, warnings: cleaned.warnings };
  }
  // Empty / missing text/html → literal plain text (paragraphs + hard breaks).
  if (!(html ?? '').trim() && (plain ?? '').length > 0) {
    const cleaned = cleanEditorIncomingPlainText(plain);
    if (!cleaned.html.trim()) return null;
    return { html: cleaned.html, warnings: cleaned.warnings };
  }
  return null;
}

/** Insert cleaned paste HTML into the ProseMirror view; returns true if handled. */
export function insertArchivePasteHtml(view: EditorView, html: string): boolean {
  if (!html.trim()) return false;
  const parser = PmDOMParser.fromSchema(view.state.schema);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  // A lone <p> must paste as open/inline content so mid-sentence, list items and
  // headings keep surrounding text (a block <p> would split them).
  const onlyP =
    wrap.childNodes.length === 1 &&
    wrap.firstElementChild?.tagName.toLowerCase() === 'p';
  if (onlyP) {
    const inner = document.createElement('div');
    while (wrap.firstElementChild!.firstChild) {
      inner.appendChild(wrap.firstElementChild!.firstChild);
    }
    const slice = parser.parseSlice(inner, { preserveWhitespace: true });
    view.dispatch(view.state.tr.replaceSelection(slice));
    return true;
  }
  const slice = parser.parseSlice(wrap, { preserveWhitespace: true });
  // No scrollIntoView: jsdom/Text nodes lack getClientRects and paste must not depend on layout.
  view.dispatch(view.state.tr.replaceSelection(slice));
  return true;
}

/**
 * Handle a paste event for the archive editor.
 * Returns true when the event was consumed (table / TSV / plain-only paths).
 */
export function handleArchivePasteEvent(
  view: EditorView,
  event: ClipboardEvent,
  onWarnings?: (warnings: ContentCleanWarning[]) => void
): boolean {
  const data = event.clipboardData;
  if (!data) return false;
  const html = data.getData('text/html') ?? '';
  const plain = data.getData('text/plain') ?? '';
  const decision = decideArchivePaste(html, plain);
  if (!decision) return false;
  event.preventDefault();
  if (decision.warnings.length) onWarnings?.(decision.warnings);
  return insertArchivePasteHtml(view, decision.html);
}
