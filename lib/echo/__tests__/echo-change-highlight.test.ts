import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { archiveTiptapExtensions } from '@/lib/editor-archive-tiptap';
import { decorationsForDraft } from '@/components/editor/echo-change-highlight';

/**
 * Il testo nuovo di una sostituzione riuscita viene evidenziato in grassetto (classe
 * `echo-just-changed`). Qui si prova la parte che decide QUALE testo evidenziare, sul
 * documento vero dell'editor (schema di TipTap, senza browser).
 */
const schema = getSchema(archiveTiptapExtensions());

function docOf(...paragraphs: string[]): PMNode {
  return schema.nodeFromJSON({
    type: 'doc',
    content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  });
}

function highlighted(doc: PMNode, draft: string): string[] | null {
  const result = decorationsForDraft(doc, draft);
  if (!result) return null;
  return result.set.find().map((deco) => doc.textBetween(deco.from, deco.to));
}

const DRAFT = 'Fu in quel contesto che iniziai la scuola, in un ambiente alieno. Ero terrorizzato.';

describe('decorationsForDraft', () => {
  it('evidenzia il testo nuovo in mezzo al documento', () => {
    const doc = docOf(
      'Primo paragrafo, per poterlo fare. ' + DRAFT,
      'Conservo ancora il ricordo della mensa.',
      "Quel bambino ha lasciato un'impronta profonda."
    );
    expect(highlighted(doc, DRAFT)).toEqual([DRAFT]);
  });

  it('evidenzia per intero un testo che occupa più paragrafi', () => {
    const doc = docOf('Prima parte.', 'Seconda parte del testo nuovo.', 'Terza parte.');
    const found = highlighted(doc, 'Prima parte.\n\nSeconda parte del testo nuovo.');
    expect(found).toEqual(['Prima parte.', 'Seconda parte del testo nuovo.']);
    // Con tre paragrafi di cui il testo nuovo è solo la parte centrale e finale.
    expect(highlighted(doc, 'Seconda parte del testo nuovo.\n\nTerza parte.')).toEqual([
      'Seconda parte del testo nuovo.',
      'Terza parte.',
    ]);
  });

  it('ignora i segni di markdown nel testo proposto (grassetto, titolo)', () => {
    const doc = docOf('Capitolo uno', 'Una frase con una parola importante dentro.');
    expect(highlighted(doc, '**Una frase** con una parola importante dentro.')).toEqual([
      'Una frase con una parola importante dentro.',
    ]);
    expect(highlighted(doc, '# Capitolo uno')).toEqual(['Capitolo uno']);
  });

  it('se il testo compare più volte, evidenzia l\'ultima occorrenza (quella aggiunta in fondo)', () => {
    const doc = docOf('Una frase ripetuta nel testo.', 'Altro.', 'Una frase ripetuta nel testo.');
    const result = decorationsForDraft(doc, 'Una frase ripetuta nel testo.');
    expect(result).not.toBeNull();
    const [deco] = result!.set.find();
    expect(deco.from).toBeGreaterThan(doc.child(0).nodeSize + doc.child(1).nodeSize - 1);
  });

  it('non evidenzia nulla se il testo non è nel documento', () => {
    expect(highlighted(docOf('Tutt\'altro testo.'), DRAFT)).toBeNull();
  });
});
