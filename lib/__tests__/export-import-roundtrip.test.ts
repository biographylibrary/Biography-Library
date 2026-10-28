// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { storedToPlainText } from '@/lib/archive-markdown';
import { buildBiographyDocxBuffer, buildBiographyTxtContent } from '@/lib/export-utils';
import { parseTextFiles } from '@/lib/text-import-parser';

// Nel browser mammoth legge un ArrayBuffer; la versione per Node vuole un Buffer. Stessa lettura.
vi.mock('mammoth', async () => {
  const actual = await vi.importActual<{ default: { convertToHtml: (i: unknown, o?: unknown) => Promise<unknown> } }>('mammoth');
  const convertToHtml = (input: { arrayBuffer?: ArrayBuffer }, options?: unknown) =>
    actual.default.convertToHtml(input.arrayBuffer ? { buffer: Buffer.from(input.arrayBuffer) } : input, options);
  return { default: { ...actual.default, convertToHtml }, convertToHtml };
});

/**
 * Ciò che si esporta si deve poter reimportare senza perdere parole: è la promessa «il file
 * esportato è tuo». Si esporta con le funzioni dell'app, si rilegge con l'importazione vera.
 */
const letters = (t: string) => t.normalize('NFC').replace(/\s+/g, '');

const SAMPLES: Record<string, string> = {
  semplice: 'Sono nato a Bellinzona nel 1948.\n\nMio nonno mi portava a pescare ogni domenica.',
  formattato: 'Una **parola in grassetto** e *una in corsivo*.\n\nUn secondo paragrafo con «virgolette» e un apostrofo: l\'altra volta.',
  titoli: '# Infanzia\n\nLa casa vicino al fiume.\n\n## La scuola\n\nLa maestra Rossi.',
  elenco: 'Cose da ricordare:\n\n- il pane di mia madre\n- la bicicletta\n- il lago',
  numerato: 'Le tappe:\n\n1. la scuola\n2. la falegnameria\n3. la fabbrica',
  unicode: 'Caffè, perché, è così. 日本語のテキスト. Привет, мир. مرحبا بالعالم.',
  numeroInizio: '1944. Fu un anno difficile per tutti.\n\nPoi tornò la pace.',
  aCapo: 'Prima riga della poesia  \nSeconda riga  \nTerza riga',
};

/** Il testo importato: se il file ha titoli, l'app ne fa capitoli; qui si rimettono come titoli. */
function textOf(parsed: Awaited<ReturnType<typeof parseTextFiles>>): string {
  if (!parsed.sections?.length) return parsed.content;
  return parsed.sections
    .map((s) => (s.title ? `# ${s.title}\n\n${s.content}` : s.content))
    .join('\n\n');
}

async function viaDocx(content: string): Promise<string> {
  const buffer = await buildBiographyDocxBuffer('Titolo', 'Autore', '2026-01-01', [{ title: 'Capitolo', content }]);
  const parsed = await parseTextFiles([new File([buffer], 'prova.docx')], 'it');
  return textOf(parsed);
}

async function viaTxt(content: string): Promise<string> {
  const txt = buildBiographyTxtContent('Titolo', 'Autore', '2026-01-01', [{ title: 'Capitolo', content }]);
  const parsed = await parseTextFiles([new File([txt], 'prova.txt')], 'it');
  return textOf(parsed);
}

describe('esporta e reimporta: le parole restano', () => {
  for (const [name, md] of Object.entries(SAMPLES)) {
    const want = letters(storedToPlainText(md));

    it(`Word, ${name}`, async () => {
      const back = letters(storedToPlainText(await viaDocx(md)));
      // Il file esportato porta titolo, autore e data: il testo scritto deve esserci tutto, in ordine.
      expect(back).toContain(want);
    });

    it(`testo semplice, ${name}`, async () => {
      const back = letters(storedToPlainText(await viaTxt(md)));
      expect(back).toContain(want);
    });
  }
});

describe('esporta in Word e reimporta: la formattazione resta', () => {
  it('grassetto e corsivo', async () => {
    const back = await viaDocx(SAMPLES.formattato);
    expect(back).toMatch(/\*\*parola in grassetto\*\*/);
    expect(back).toMatch(/(?<!\*)\*una in corsivo\*(?!\*)|_una in corsivo_/);
  });

  it('i titoli restano titoli', async () => {
    const back = await viaDocx(SAMPLES.titoli);
    expect(back).toMatch(/^#{1,3} Infanzia$/m);
    expect(back).toMatch(/^#{1,3} La scuola$/m);
  });

  it('gli elenchi restano elenchi', async () => {
    expect(await viaDocx(SAMPLES.elenco)).toMatch(/^- il pane di mia madre$/m);
    expect(await viaDocx(SAMPLES.numerato)).toMatch(/^1\. la scuola$/m);
  });
});
