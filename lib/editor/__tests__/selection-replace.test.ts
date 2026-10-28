// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { archiveMarkdownToEditorHtml, archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { replaceWithinRange } from '@/lib/editor/selection-replace';

beforeAll(() => {
  const r = { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
  for (const p of [Element.prototype, CharacterData.prototype, Range.prototype] as any[]) {
    p.getClientRects = () => [r];
    p.getBoundingClientRect = () => r;
  }
});

const editors: Editor[] = [];
afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

function editorWith(markdown: string) {
  const editor = new Editor({ extensions: archiveTiptapExtensions(), content: archiveMarkdownToEditorHtml(markdown) });
  editors.push(editor);
  return editor;
}

/** Posizioni di un testo nel documento: l'intero paragrafo che lo contiene. */
function rangeOfParagraph(editor: Editor, startsWith: string) {
  let found = { from: -1, to: -1 };
  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock && node.textContent.startsWith(startsWith)) found = { from: pos + 1, to: pos + node.nodeSize - 1 };
  });
  return found;
}

describe('la correzione si applica dentro il brano selezionato', () => {
  it('una parola che compare anche prima non viene cambiata fuori dal brano', () => {
    const editor = editorWith('PRIMA OCCORRENZA: non so perchè.\n\nMia nonna stava sotto il tavolo perchè faceva caldo.');
    const range = rangeOfParagraph(editor, 'Mia nonna');
    expect(replaceWithinRange(editor, range, 'perchè', 'perché')).toBe(true);
    const text = editor.state.doc.textContent;
    expect(text).toContain('PRIMA OCCORRENZA: non so perchè.');
    expect(text).toContain('Mia nonna stava sotto il tavolo perché faceva caldo.');
  });

  it('cambia solo la prima occorrenza dentro il brano', () => {
    const editor = editorWith('Era perchè sì e perchè no.');
    const range = rangeOfParagraph(editor, 'Era');
    replaceWithinRange(editor, range, 'perchè', 'perché');
    expect(editor.state.doc.textContent).toBe('Era perché sì e perchè no.');
  });

  it('mantiene la formattazione intorno e dentro il testo corretto', () => {
    const editor = editorWith('Una frase con **grassetto** e *corsivo*, scritta perchè sì.');
    const range = rangeOfParagraph(editor, 'Una frase');
    expect(replaceWithinRange(editor, range, 'perchè sì', 'perché sì')).toBe(true);
    const html = editor.getHTML();
    expect(html).toContain('<strong>grassetto</strong>');
    expect(html).toContain('<em>corsivo</em>');
    expect(html).toContain('perché sì');
  });

  it('trova il testo anche se attraversa una parte in grassetto', () => {
    const editor = editorWith('Il Ticino ricorda **l’inverno del 1963** quando il lago gelò.');
    const range = rangeOfParagraph(editor, 'Il Ticino');
    expect(replaceWithinRange(editor, range, 'ricorda l’inverno', 'ricordava l’inverno')).toBe(true);
    expect(editor.state.doc.textContent).toContain('ricordava l’inverno del 1963');
  });

  it('se il testo non è nel brano non cambia niente e lo dice', () => {
    const editor = editorWith('Primo paragrafo con perchè.\n\nSecondo paragrafo.');
    const range = rangeOfParagraph(editor, 'Secondo');
    expect(replaceWithinRange(editor, range, 'perchè', 'perché')).toBe(false);
    expect(editor.state.doc.textContent).toBe('Primo paragrafo con perchè.Secondo paragrafo.');
  });

  it('un intervallo vuoto o un testo vuoto non fanno niente', () => {
    const editor = editorWith('Testo.');
    expect(replaceWithinRange(editor, { from: 3, to: 3 }, 'x', 'y')).toBe(false);
    expect(replaceWithinRange(editor, { from: 1, to: 5 }, '', 'y')).toBe(false);
  });

  it('un testo con segni speciali si inserisce com\'è, senza essere letto come codice', () => {
    const editor = editorWith('Dissi ok e basta.');
    const range = rangeOfParagraph(editor, 'Dissi');
    replaceWithinRange(editor, range, 'ok', '<b>ok</b> & «ok»');
    expect(editor.state.doc.textContent).toContain('<b>ok</b> & «ok»');
    expect(editor.getHTML()).not.toContain('<b>');
  });

  it('più correzioni di fila nello stesso brano: la seconda segue le modifiche della prima', () => {
    const editor = editorWith('Io andavo a scuola, era due chilometri, perchè faceva freddo.');
    let range = rangeOfParagraph(editor, 'Io andavo');
    const original = range;
    expect(replaceWithinRange(editor, range, 'era due chilometri', 'erano due chilometri e mezzo')).toBe(true);
    // l'intervallo si accorcia/allunga con il testo: lo si ricalcola come fa l'editor con la mappatura
    range = { from: original.from, to: original.to + ('erano due chilometri e mezzo'.length - 'era due chilometri'.length) };
    expect(replaceWithinRange(editor, range, 'perchè', 'perché')).toBe(true);
    expect(editor.state.doc.textContent).toBe('Io andavo a scuola, erano due chilometri e mezzo, perché faceva freddo.');
  });
});
