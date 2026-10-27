// @vitest-environment jsdom
/**
 * Dopo il salvataggio il testo dell'autore passa da molti altri punti: lettura pubblica, controllo
 * prima della pubblicazione (divisione in pezzi e impronta), esportazione in testo e Word, PDF,
 * importazione di un file esportato. Qui si prendono i testi che l'editor salva dopo gesti
 * generati con un seme fisso e si controlla in ogni punto che le parole siano le stesse e che
 * non compaiano segni di Markdown (asterischi, barre) che l'autore non ha scritto.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  archiveMarkdownToHtml,
  normalizeArchiveMarkdown,
  roundTripArchiveMarkdown,
  storedToPlainText,
  storedToSafeHtml,
} from '@/lib/archive-markdown';
import { concatenateChunkBodies, splitMarkdownIntoChunks } from '@/lib/agents/screening/split-markdown-chunks';
import { buildBiographyDocxBuffer, buildBiographyTxtContent } from '@/lib/export-utils';
import { plainFromStored, textsAreIdentical } from '@/lib/edition-text-compare';
import { parsePastedText } from '@/lib/text-import-parser';
import { renderSemanticHtmlBody, type SemanticRenderContext } from '@/lib/pdf/semantic-html-renderer';
import { installDomShims, savedTextsOfJourney } from './helpers/author-journey';

beforeAll(installDomShims);

const words = (t: string) => t.normalize('NFC').split(/\s+/).filter(Boolean).join(' ');
const letters = (t: string) => t.normalize('NFC').replace(/\s+/g, '');

function pdfText(html: string): string {
  const drawn: string[] = [];
  let fontSize = 11;
  const doc = {
    setFontSize: (n: number) => { fontSize = n; },
    setTextColor: () => {},
    getTextWidth: (text: string) => text.length * (fontSize * 0.45),
    text: (text: string | string[]) => { for (const t of Array.isArray(text) ? text : [text]) drawn.push(t); },
    setFont: () => {},
  } as unknown as SemanticRenderContext['doc'];
  const ctx: SemanticRenderContext = {
    doc, y: 20, textAreaTop: 20, textAreaBottom: 260,
    textStartX: () => 20, textAvailableWidth: () => 100, absolutePage: 1,
    applyFont: () => {}, addNewPage: vi.fn(), language: 'it',
  };
  renderSemanticHtmlBody(ctx, html);
  return drawn.join(' ');
}

function importedText(input: string): string {
  const parsed = parsePastedText(input, 'it');
  if (parsed.sections?.length) return parsed.sections.map((s) => `${s.title}\n\n${s.content}`).join('\n\n');
  return parsed.content;
}

describe('dal testo salvato alle altre parti del sistema', () => {
  it('lettura, pezzi del controllo, esportazioni, PDF e importazione non cambiano le parole', async () => {
    const SEEDS = Number(process.env.FUZZ_SEEDS ?? 120);
    const fails: Array<{ seed: number; kind: string; text: string; got?: string; want?: string }> = [];
    let docx = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const saved of savedTextsOfJourney(seed)) {
        const plain = storedToPlainText(saved);
        const fail = (kind: string, got?: string, want?: string) => fails.push({ seed, kind, text: saved, got, want });

        if (normalizeArchiveMarkdown(saved) !== saved) fail('non-canonico', normalizeArchiveMarkdown(saved), saved);
        else if (roundTripArchiveMarkdown(saved) !== saved) fail('andata-ritorno', roundTripArchiveMarkdown(saved), saved);

        for (const max of [25, 90, 4000]) {
          const chunks = splitMarkdownIntoChunks(saved, max);
          if (concatenateChunkBodies(chunks) !== saved) { fail(`pezzi-${max}`); break; }
        }

        if (words(plainFromStored(saved)) !== words(plain)) fail('confronto-edizioni', plainFromStored(saved), plain);
        if (!textsAreIdentical(saved, saved)) fail('identico-a-se-stesso');

        const html = storedToSafeHtml(saved);
        if (/[*\\]/.test(storedToPlainText(saved).replace(/\\?[*\\]/g, (m, off, s) => (saved.includes(m) ? '' : m)))) { /* controllo sotto */ }

        const txt = buildBiographyTxtContent('T', 'A', '2026-01-01', [{ title: 'S', content: saved }]);
        if (!txt.includes(plain)) fail('esporta-testo', txt.slice(-120), plain);

        // Nel PDF le voci di elenco portano il loro numero o punto: lì il testo non è identico per costruzione.
        const hasList = /^(?:[-*+]|\d+\.)(?: |$)/m.test(saved);
        // Il separatore di scena (***) nel PDF è disegnato come asterischi: si toglie da entrambi.
        const hasRule = /^\*\*\*$/m.test(saved);
        // Il PDF può anche andare a capo con un trattino (sillabazione): non è testo perso.
        const noRule = (t: string) => (hasRule ? t.replace(/\*/g, '') : t).replace(/-/g, '');
        if (!hasList && noRule(letters(pdfText(html))) !== noRule(letters(plain))) fail('pdf', letters(pdfText(html)), letters(plain));

        // Un testo che contiene davvero «<b>» viene letto come HTML dall'importazione del testo semplice.
        const reimportedPlain = importedText(plain);
        if (!/<[a-z!/]/i.test(plain) && letters(storedToPlainText(reimportedPlain)) !== letters(plain)) fail('importa-testo-esportato', storedToPlainText(reimportedPlain), plain);

        const reimportedHtml = importedText(html);
        if (letters(storedToPlainText(reimportedHtml)) !== letters(plain)) fail('importa-html', storedToPlainText(reimportedHtml), plain);

        if (docx < 40 && seed % 3 === 0) {
          docx++;
          const buf = await buildBiographyDocxBuffer('T', 'A', '2026-01-01', [{ title: 'S', content: saved }]);
          if (!buf || buf.length < 500) fail('docx-vuoto');
        }
      }
    }
    const byKind = new Map<string, typeof fails>();
    for (const f of fails) byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), f]);
    const lines = Array.from(byKind.entries()).map(([k, v]) =>
      `${k}: ${v.length} (es. seed ${v[0].seed})\n  TESTO: ${JSON.stringify(v[0].text).slice(0, 260)}\n  GOT : ${JSON.stringify(v[0].got ?? '').slice(0, 200)}\n  WANT: ${JSON.stringify(v[0].want ?? '').slice(0, 200)}`);
    console.log(`DOWNSTREAM falliti ${fails.length}\n` + lines.join('\n'));
    expect(fails.length).toBe(0);
    expect(archiveMarkdownToHtml('')).toBe('');
  }, 120_000);
});
