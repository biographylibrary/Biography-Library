// @vitest-environment jsdom
/**
 * La guardia di caricamento gira anche mentre si scrive: non deve bloccare l'editor per cose che
 * l'autore ha fatto con i comandi normali e che non cambiano il testo salvato.
 */
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { htmlToArchiveMarkdown, normalizeArchiveMarkdown } from '@/lib/archive-markdown';
import { archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { editorLoadMatchesStored } from '@/lib/editor-load-guard';
import { nfc } from '@/lib/nfc';

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

/** Editor col documento dato, poi il controllo che farebbe la pagina dopo un salvataggio. */
function guardAfter(html: string): boolean {
  const editor = new Editor({ extensions: archiveTiptapExtensions(), content: html });
  editors.push(editor);
  const saved = normalizeArchiveMarkdown(nfc(htmlToArchiveMarkdown(editor.getHTML())));
  return editorLoadMatchesStored(saved, editor);
}

describe('guardia di caricamento durante la scrittura', () => {
  it('un titolo vuoto (H1 premuto su una riga vuota) non blocca', () => {
    expect(guardAfter('<p>Testo scritto.</p><h1></h1>')).toBe(true);
    expect(guardAfter('<h2></h2><p>Testo scritto.</p>')).toBe(true);
  });

  it('un paragrafo fatto solo di a capo forzati non blocca', () => {
    expect(guardAfter('<p>Testo scritto.</p><p><br></p><p>Altro.</p>')).toBe(true);
  });

  it('grassetto su una selezione con lo spazio ai bordi non blocca', () => {
    expect(guardAfter('<p>Una frase <strong>con </strong>altre parole.</p>')).toBe(true);
    expect(guardAfter('<p>Una frase<em> con</em> altre parole.</p>')).toBe(true);
  });

  it('un testo davvero diverso da quello salvato blocca ancora', () => {
    const editor = new Editor({ extensions: archiveTiptapExtensions(), content: '<p>Testo scritto.</p>' });
    editors.push(editor);
    expect(editorLoadMatchesStored('Un altro testo.', editor)).toBe(false);
    expect(editorLoadMatchesStored('Testo scritto.\n\nPiù un paragrafo.', editor)).toBe(false);
  });
});
