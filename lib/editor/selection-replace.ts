import type { Editor } from '@tiptap/core';

/**
 * Applica una correzione del controllo grammaticale dentro il brano che l'autore aveva selezionato,
 * non nel documento intero. Prima «Accetta» cercava la prima occorrenza del testo da correggere in
 * tutto il foglio: con una parola sola («perchè») cambiava un punto che l'autore non aveva scelto, e
 * il brano selezionato restava com'era.
 */
export type MarkedRange = { from: number; to: number };

type Piece = { text: string; positions: number[] };

/** Il testo di un blocco dentro l'intervallo, con la posizione di ogni carattere nel documento. */
function textblockPieces(editor: Editor, range: MarkedRange): Piece[] {
  const pieces: Piece[] = [];
  editor.state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (!node.isTextblock) return true;
    const start = pos + 1;
    const piece: Piece = { text: '', positions: [] };
    node.forEach((child, offset) => {
      const childPos = start + offset;
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) {
          const at = childPos + i;
          if (at < range.from || at >= range.to) continue;
          piece.text += child.text[i];
          piece.positions.push(at);
        }
      } else if (childPos >= range.from && childPos < range.to) {
        // a capo forzato o altra voce in linea: un carattere che non si confonde con il testo
        piece.text += '\n';
        piece.positions.push(childPos);
      }
    });
    if (piece.text) pieces.push(piece);
    return false;
  });
  return pieces;
}

/** Vero se la sostituzione è avvenuta: la prima occorrenza di `original` dentro l'intervallo. */
export function replaceWithinRange(
  editor: Editor,
  range: MarkedRange,
  original: string,
  replacement: string
): boolean {
  if (!original || range.to <= range.from) return false;
  for (const piece of textblockPieces(editor, range)) {
    const index = piece.text.indexOf(original);
    if (index < 0) continue;
    const from = piece.positions[index];
    const to = piece.positions[index + original.length - 1] + 1;
    return editor
      .chain()
      .command(({ tr }) => {
        tr.insertText(replacement, from, to);
        return true;
      })
      .run();
  }
  return false;
}
