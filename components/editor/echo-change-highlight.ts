import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { plainDraftText } from '@/lib/echo/apply-draft';

export const echoHighlightKey = new PluginKey<DecorationSet>('echoChangeHighlight');

/** How long the new or replaced words stay bold. */
export const ECHO_CHANGE_HIGHLIGHT_MS = 4_000;

export const echoChangeHighlight = Extension.create({
  name: 'echoChangeHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: echoHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const next = tr.getMeta(echoHighlightKey);
            if (next === 'clear') return DecorationSet.empty;
            if (next instanceof DecorationSet) return next;
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return echoHighlightKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

type CharPos = { ch: string; pos: number };

function documentChars(doc: PMNode): CharPos[] {
  const chars: CharPos[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        chars.push({ ch: node.text[i], pos: pos + i });
      }
      return false;
    }
    if (node.isBlock && chars.length > 0 && chars[chars.length - 1].ch !== '\n') {
      chars.push({ ch: '\n', pos: -1 });
    }
    return true;
  });
  return chars;
}

function rangeForNeedle(chars: CharPos[], needle: string): { from: number; to: number } | null {
  if (needle.length < 2) return null;
  const hay = chars.map((entry) => entry.ch).join('');
  const idx = hay.lastIndexOf(needle);
  if (idx < 0) return null;
  let from = -1;
  let to = -1;
  for (let i = idx; i < idx + needle.length; i++) {
    const pos = chars[i]?.pos ?? -1;
    if (pos < 0) continue;
    if (from < 0) from = pos;
    to = pos + 1;
  }
  if (from < 0 || to <= from) return null;
  return { from, to };
}

export function decorationsForDraft(
  doc: PMNode,
  draftText: string
): { set: DecorationSet; from: number } | null {
  const needle = plainDraftText(draftText);
  const chars = documentChars(doc);
  const lines = needle
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);
  const candidates = needle.length >= 2 ? [needle, ...lines] : lines;

  for (const candidate of candidates) {
    const range = rangeForNeedle(chars, candidate);
    if (!range) continue;
    const decos: Decoration[] = [];
    doc.nodesBetween(range.from, range.to, (node, pos) => {
      if (!node.isText) return;
      const from = Math.max(pos, range.from);
      const to = Math.min(pos + node.nodeSize, range.to);
      if (from < to) {
        decos.push(Decoration.inline(from, to, { class: 'echo-just-changed' }));
      }
    });
    if (!decos.length) continue;
    return { set: DecorationSet.create(doc, decos), from: range.from };
  }
  return null;
}
