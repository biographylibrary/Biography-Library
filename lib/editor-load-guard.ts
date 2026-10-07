/**
 * Independent plain-text + structure check when loading archive Markdown into TipTap.
 * If the editor document does not carry the same author text and block shape,
 * editing must stop (e.g. ***emphasis*** wrongly split into scene separators).
 */
import type { Editor } from '@tiptap/core';
import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';
import { archiveMarkdownToHtml, storedToPlainText } from '@/lib/archive-markdown';
import { nfc } from '@/lib/nfc';

function normalizePlain(text: string): string {
  return nfc(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain text of stored Markdown/HTML, formatting marks removed. */
export function plainTextFromStoredMarkdown(stored: string): string {
  return normalizePlain(storedToPlainText(stored ?? ''));
}

/** Plain text of the TipTap document (independent of Markdown serialization). */
export function plainTextFromEditorDoc(editor: Editor): string {
  const doc = editor.state.doc;
  return normalizePlain(doc.textBetween(0, doc.content.size, '\n', '\n'));
}

export type ArchiveDocStructure = {
  paragraphs: number;
  headings: number;
  horizontalRules: number;
  bulletLists: number;
  orderedLists: number;
  listItems: number;
};

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagName(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

/** Count archive blocks in HTML (markdown-it or TipTap). */
export function structureFromArchiveHtml(html: string): ArchiveDocStructure {
  const root = parse(html ?? '', { comment: false });
  const counts: ArchiveDocStructure = {
    paragraphs: 0,
    headings: 0,
    horizontalRules: 0,
    bulletLists: 0,
    orderedLists: 0,
    listItems: 0,
  };

  const walk = (nodes: Node[], parentTag = '') => {
    for (const node of nodes) {
      if (!isElement(node)) continue;
      const tag = tagName(node);
      if (tag === 'p') {
        // TipTap wraps list-item text in <p>; markdown-it often does not.
        // Count only free paragraphs so both sides agree.
        if (parentTag !== 'li') {
          const text = node.text.replace(/\u00a0/g, ' ').trim();
          const hasBr = node.querySelector('br');
          if (text || hasBr) counts.paragraphs += 1;
        }
      } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') counts.headings += 1;
      else if (tag === 'hr') counts.horizontalRules += 1;
      else if (tag === 'ul') counts.bulletLists += 1;
      else if (tag === 'ol') counts.orderedLists += 1;
      else if (tag === 'li') counts.listItems += 1;
      walk(node.childNodes, tag);
    }
  };
  walk(root.childNodes);
  return counts;
}

export function structureFromStoredMarkdown(stored: string): ArchiveDocStructure {
  return structureFromArchiveHtml(archiveMarkdownToHtml(stored ?? ''));
}

export function structureFromEditorDoc(editor: Editor): ArchiveDocStructure {
  const counts: ArchiveDocStructure = {
    paragraphs: 0,
    headings: 0,
    horizontalRules: 0,
    bulletLists: 0,
    orderedLists: 0,
    listItems: 0,
  };
  editor.state.doc.descendants((node, _pos, parent) => {
    switch (node.type.name) {
      case 'paragraph': {
        if (parent?.type.name === 'listItem') break;
        // TipTap often keeps a trailing empty paragraph; ignore empties.
        const text = node.textBetween(0, node.content.size, '\n', '\n').trim();
        let hasHardBreak = false;
        node.forEach((child) => {
          if (child.type.name === 'hardBreak') hasHardBreak = true;
        });
        if (text || hasHardBreak) counts.paragraphs += 1;
        break;
      }
      case 'heading':
        counts.headings += 1;
        break;
      case 'horizontalRule':
        counts.horizontalRules += 1;
        break;
      case 'bulletList':
        counts.bulletLists += 1;
        break;
      case 'orderedList':
        counts.orderedLists += 1;
        break;
      case 'listItem':
        counts.listItems += 1;
        break;
      default:
        break;
    }
  });
  return counts;
}

function structuresMatch(a: ArchiveDocStructure, b: ArchiveDocStructure): boolean {
  return (
    a.paragraphs === b.paragraphs &&
    a.headings === b.headings &&
    a.horizontalRules === b.horizontalRules &&
    a.bulletLists === b.bulletLists &&
    a.orderedLists === b.orderedLists &&
    a.listItems === b.listItems
  );
}

export function editorLoadMatchesStored(storedMarkdown: string, editor: Editor): boolean {
  if (plainTextFromStoredMarkdown(storedMarkdown) !== plainTextFromEditorDoc(editor)) {
    return false;
  }
  return structuresMatch(
    structureFromStoredMarkdown(storedMarkdown),
    structureFromEditorDoc(editor)
  );
}
