/**
 * Independent plain-text check when loading archive Markdown into TipTap.
 * If the editor document does not carry the same author text, editing must stop.
 */
import type { Editor } from '@tiptap/core';
import { storedToPlainText } from '@/lib/archive-markdown';
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

export function editorLoadMatchesStored(storedMarkdown: string, editor: Editor): boolean {
  return plainTextFromStoredMarkdown(storedMarkdown) === plainTextFromEditorDoc(editor);
}
