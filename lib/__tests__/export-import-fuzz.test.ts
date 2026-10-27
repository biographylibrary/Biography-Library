// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { storedToPlainText } from '@/lib/archive-markdown';
import { buildBiographyDocxBuffer } from '@/lib/export-utils';
import { parseTextFile } from '@/lib/text-import-parser';
import { installDomShims, savedTextsOfJourney } from './helpers/author-journey';

// Nel browser mammoth legge un ArrayBuffer; la versione per Node vuole un Buffer. Stessa lettura.
vi.mock('mammoth', async () => {
  const actual = await vi.importActual<{ default: { convertToHtml: (i: unknown, o?: unknown) => Promise<unknown> } }>('mammoth');
  const convertToHtml = (input: { arrayBuffer?: ArrayBuffer }, options?: unknown) =>
    actual.default.convertToHtml(input.arrayBuffer ? { buffer: Buffer.from(input.arrayBuffer) } : input, options);
  return { default: { ...actual.default, convertToHtml }, convertToHtml };
});

beforeAll(installDomShims);

const letters = (t: string) => t.normalize('NFC').replace(/\s+/g, '');

/**
 * Testi veri di un autore virtuale (gesti nell'editor, salvataggio): esportati in Word e
 * reimportati con l'importazione dell'app, le parole devono essere le stesse e nello stesso ordine.
 */
describe('Word: dal testo salvato al file e ritorno', () => {
  it('non si perde né si inventa una parola', async () => {
    const fails: string[] = [];
    const SEEDS = Number(process.env.FUZZ_SEEDS ?? 40);
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const saved of savedTextsOfJourney(seed).slice(-2)) {
        const buffer = await buildBiographyDocxBuffer('T', 'A', '2026-01-01', [{ title: 'S', content: saved }]);
        // jsdom non sa leggere un File come ArrayBuffer: si passa un file finto con gli stessi tre campi.
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const file = { name: 'x.docx', size: buffer.byteLength, arrayBuffer: async () => arrayBuffer } as unknown as File;
        const parsed = await parseTextFile(file, 'it');
        const text = parsed.sections?.length
          ? parsed.sections.map((s) => `${s.title}\n\n${s.content}`).join('\n\n')
          : parsed.content;
        const want = letters(storedToPlainText(saved));
        if (!letters(storedToPlainText(text)).includes(want)) {
          fails.push(`seed ${seed}: ${JSON.stringify(saved).slice(0, 160)}`);
        }
      }
    }
    if (fails.length) console.log('WORD falliti', fails.length, '\n' + fails.slice(0, 6).join('\n'));
    expect(fails).toEqual([]);
  }, 120_000);
});
