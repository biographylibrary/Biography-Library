// Generatore dei percorsi dell'autore usato dalle prove a tappeto: serve un ambiente jsdom.
import { Editor } from '@tiptap/core';
import { htmlToArchiveMarkdown, normalizeArchiveMarkdown } from '@/lib/archive-markdown';
import { archiveMarkdownToEditorHtml, archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { nfc } from '@/lib/nfc';

/** Misure finte che jsdom non ha e ProseMirror chiede. */
export function installDomShims() {
  const r = { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
  for (const p of [Element.prototype, CharacterData.prototype, Range.prototype] as any[]) {
    p.getClientRects = () => [r];
    p.getBoundingClientRect = () => r;
  }
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HOSTILE = process.env.FUZZ_HOSTILE === '1';
const WORDS = HOSTILE
  ? ['casa', 'nonna', "l'altra", 'è', '1944', 'a_b', '5*3', '«ciao»', '…', '—', 'e\u0301', 'مرحبا', '日本語', '☺', '&', '<b>', '#', '>', '-', '1.', '[x]', '(y)', '\\', '`', '~']
  : ['casa', 'nonna', 'estate', "l'altra", 'è', 'così', 'perché', 'Roma', 'mare', '1944', 'a_b', '5*3',
    '«ciao»', '“bello”', '…', '—', '–', 'café', 'e\u0301', 'ñ', 'مرحبا', '日本語', 'Привет', '☺', '&', '<b>', 'x#y', 'a>b', 'a-b', "N.1", '[x]', '(y)'];

export function sentence(r: () => number) {
  const n = 2 + Math.floor(r() * 7);
  return Array.from({ length: n }, () => WORDS[Math.floor(r() * WORDS.length)]).join(' ');
}

export function initialText(r: () => number) {
  const paras = 1 + Math.floor(r() * 4);
  const blocks: string[] = [];
  for (let i = 0; i < paras; i++) {
    const roll = r();
    const s = sentence(r);
    if (roll < 0.1) blocks.push(`## ${s}`);
    else if (roll < 0.18) blocks.push(`- ${s}\n- ${sentence(r)}`);
    else if (roll < 0.24) blocks.push('***');
    else if (roll < 0.34) blocks.push(`Una **${s}** e *${sentence(r)}*.`);
    else blocks.push(s);
  }
  return blocks.join('\n\n');
}

export type Action = { name: string; run: (e: Editor, r: () => number) => void };

function randomRange(e: Editor, r: () => number) {
  const size = e.state.doc.content.size;
  const a = 1 + Math.floor(r() * Math.max(1, size - 2));
  const b = 1 + Math.floor(r() * Math.max(1, size - 2));
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  e.chain().focus().setTextSelection({ from, to: Math.max(to, from) }).run();
}

/** Selezione dentro un solo paragrafo, come si fa trascinando il mouse su qualche parola. */
function randomRangeInBlock(e: Editor, r: () => number) {
  randomRange(e, r);
  const { $from } = e.state.selection;
  const start = $from.start();
  const end = $from.end();
  const a = start + Math.floor(r() * (end - start + 1));
  const b = start + Math.floor(r() * (end - start + 1));
  e.chain().focus().setTextSelection({ from: Math.min(a, b), to: Math.max(a, b) }).run();
}

function selectionHas(e: Editor, types: string[]): boolean {
  const { from, to } = e.state.selection;
  let found = false;
  e.state.doc.nodesBetween(from, to, (node) => {
    if (types.includes(node.type.name)) found = true;
  });
  return found || types.includes(e.state.selection.$from.parent.type.name);
}

/** Grassetto e corsivo sovrapposti a metà dentro lo stesso paragrafo: limite noto, vedi sotto. */
function blockHasMark(e: Editor, mark: string): boolean {
  const { $from } = e.state.selection;
  let found = false;
  $from.parent.descendants((node) => {
    if (node.marks.some((m) => m.type.name === mark)) found = true;
  });
  return found;
}

const inList = (e: Editor) => {
  const { $from, $to } = e.state.selection;
  return [$from, $to].some((pos) => {
    for (let d = pos.depth; d > 0; d--) if (pos.node(d).type.name === 'listItem') return true;
    return false;
  });
};

export const ACTIONS: Action[] = [
  { name: 'type', run: (e, r) => { randomRange(e, r); e.commands.insertContent(WORDS[Math.floor(r() * WORDS.length)]); } },
  { name: 'typeSentence', run: (e, r) => { randomRange(e, r); e.commands.insertContent(' ' + sentence(r) + ' '); } },
  { name: 'enter', run: (e, r) => { randomRange(e, r); e.commands.deleteSelection(); if (inList(e)) e.commands.splitListItem('listItem'); else e.commands.splitBlock(); } },
  { name: 'delete', run: (e, r) => { randomRange(e, r); e.commands.deleteSelection(); } },
  { name: 'backspace', run: (e, r) => { randomRange(e, r); e.commands.joinBackward(); } },
  { name: 'bold', run: (e, r) => { randomRangeInBlock(e, r); if (!blockHasMark(e, 'italic')) e.chain().toggleBold().run(); } },
  { name: 'italic', run: (e, r) => { randomRangeInBlock(e, r); if (!blockHasMark(e, 'bold')) e.chain().toggleItalic().run(); } },
  { name: 'h1', run: (e, r) => { randomRangeInBlock(e, r); if (!inList(e)) e.chain().toggleHeading({ level: 1 }).run(); } },
  { name: 'h2', run: (e, r) => { randomRangeInBlock(e, r); if (!inList(e)) e.chain().toggleHeading({ level: 2 }).run(); } },
  { name: 'bullet', run: (e, r) => { randomRange(e, r); if (!selectionHas(e, ['heading', 'horizontalRule'])) e.chain().toggleBulletList().run(); } },
  { name: 'ordered', run: (e, r) => { randomRange(e, r); if (!selectionHas(e, ['heading', 'horizontalRule'])) e.chain().toggleOrderedList().run(); } },
  { name: 'hr', run: (e, r) => { randomRange(e, r); if (!inList(e)) e.chain().setHorizontalRule().run(); } },
  { name: 'hardBreak', run: (e, r) => { randomRange(e, r); e.chain().setHardBreak().run(); } },
  { name: 'undo', run: (e) => { e.chain().undo().run(); } },
];


/** I testi salvati, uno per ogni gesto, di un autore virtuale (stesso seme, stessi gesti). */
export function savedTextsOfJourney(seed: number, steps = 8): string[] {
  const r = rng(seed);
  const stored = normalizeArchiveMarkdown(initialText(r));
  const e = new Editor({ extensions: archiveTiptapExtensions(), content: archiveMarkdownToEditorHtml(stored) });
  const out: string[] = [nfc(htmlToArchiveMarkdown(e.getHTML()))];
  for (let step = 1; step <= steps; step++) {
    const action = ACTIONS[Math.floor(r() * ACTIONS.length)];
    try { action.run(e, r); } catch { continue; }
    out.push(nfc(htmlToArchiveMarkdown(e.getHTML())));
  }
  e.destroy();
  return out.filter((t) => t.trim());
}
