// @vitest-environment node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { processPhoto } from '@/lib/server/photo-processing';

/**
 * Il PDF di una biografia con 15 foto a tutta pagina, con le foto come arrivavano prima (file della
 * fotocamera, 12 megapixel) e dopo l'elaborazione del server (lato lungo 2560, JPEG mozjpeg q85,
 * senza metadati). Il generatore è quello vero (lib/pdf-export.ts, jsPDF); sono finti solo il
 * database e il bucket, che servono le foto da memoria.
 *
 * Con la variabile d'ambiente PDF_OUT_DIR=<cartella> i due PDF si salvano lì, per guardarli.
 */

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const BIOGRAPHY_ID = 'bio-pdf-test';
const PHOTO_COUNT = 15;

/** Foto da fotocamera: 4032x3024, sfumature e grana, JPEG qualità 92 con un EXIF e il profilo colore. */
async function cameraPhoto(index: number): Promise<Buffer> {
  const w = 4032;
  const h = 3024;
  const raw = Buffer.alloc(w * h * 3);
  let seed = 1000 + index * 77;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const grain = (seed >> 16) & 15;
      const o = (y * w + x) * 3;
      raw[o] = ((x * 255) / w + grain + index * 9) & 255;
      raw[o + 1] = ((y * 255) / h + grain) & 255;
      raw[o + 2] = (((x + y) * 255) / (w + h) + grain * 2) & 255;
    }
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .withExif({ IFD0: { Make: 'FotoCamera' } })
    .jpeg({ quality: 92 })
    .toBuffer();
}

const files = new Map<string, Buffer>();

type Row = Record<string, unknown>;
let mediaRows: Row[] = [];

/** Costruttore di interrogazioni minimo, sufficiente per le letture del generatore PDF. */
function fakeClient() {
  const query = (table: string) => {
    let rows: Row[] = table === 'biography_media' ? [...mediaRows] : [];
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (col: string, val: unknown) => ((rows = rows.filter((r) => r[col] === val)), b);
    b.in = (col: string, vals: unknown[]) => ((rows = rows.filter((r) => vals.includes(r[col]))), b);
    b.order = (col: string) => ((rows = [...rows].sort((a, c) => Number(a[col] ?? 0) - Number(c[col] ?? 0))), b);
    b.limit = (n: number) => ((rows = rows.slice(0, n)), b);
    b.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    b.single = async () => ({ data: rows[0] ?? null, error: null });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
    return b;
  };
  return {
    from: (table: string) => query(table),
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `mem://${path}` }, error: null }),
      }),
    },
  };
}

async function buildPdf(photos: Buffer[]): Promise<Buffer> {
  files.clear();
  mediaRows = [];
  const cover = await sharp({ create: { width: 1800, height: 2400, channels: 3, background: '#355a7a' } }).jpeg({ quality: 85 }).toBuffer();
  files.set('u/b/cover.jpg', cover);
  mediaRows.push({ id: 'cover', biography_id: BIOGRAPHY_ID, file_url: 'u/b/cover.jpg', layout: 'cover_a5', display_order: 0, caption: null });
  photos.forEach((p, i) => {
    files.set(`u/b/p${i}.jpg`, p);
    mediaRows.push({ id: `p${i}`, biography_id: BIOGRAPHY_ID, file_url: `u/b/p${i}.jpg`, layout: 'full-page', display_order: i + 1, caption: null });
  });

  const { generateBiographyPDF, setPdfExportSupabaseClient } = await import('@/lib/pdf-export');
  setPdfExportSupabaseClient(fakeClient() as never);
  const result = await generateBiographyPDF(
    {
      id: BIOGRAPHY_ID,
      title: 'Prova con quindici foto',
      author_name: 'Autore di prova',
      biography_mode: 'freeflow',
      content: {},
      content_freeflow: '<p>Un breve testo di apertura per la prova.</p>',
      layout: 'default',
      display_order: 0,
    } as never,
    undefined,
    { createdWith: 'Creato con Biography Library', allRightsReserved: 'Tutti i diritti riservati' },
    null,
    'it',
    false,
    true
  );
  return Buffer.from(result as ArrayBuffer);
}

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s])/g) ?? []).length;
const imageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Subtype\s*\/Image/g) ?? []).length;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

describe('PDF con 15 foto a tutta pagina, prima e dopo la compressione', () => {
  let originals: Buffer[];
  let compressed: Buffer[];
  let pdfBefore: Buffer;
  let pdfAfter: Buffer;

  beforeAll(async () => {
    vi.stubGlobal('fetch', async (input: unknown) => {
      const url = String(input);
      const data = files.get(url.replace('mem://', ''));
      if (!data) return new Response(null, { status: 404 });
      return new Response(new Uint8Array(data), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    });

    originals = await Promise.all(Array.from({ length: PHOTO_COUNT }, (_, i) => cameraPhoto(i)));
    compressed = await Promise.all(originals.map(async (o) => (await processPhoto(o, 'gallery')).data));
    pdfBefore = await buildPdf(originals);
    pdfAfter = await buildPdf(compressed);

    const outDir = process.env.PDF_OUT_DIR;
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'biografia-15-foto-originali.pdf'), pdfBefore);
      writeFileSync(join(outDir, 'biografia-15-foto-compresse.pdf'), pdfAfter);
    }
    console.log(
      [
        `Foto: ${PHOTO_COUNT} a tutta pagina, ${mb(originals.reduce((s, b) => s + b.length, 0))} prima, ${mb(compressed.reduce((s, b) => s + b.length, 0))} dopo`,
        `PDF con le foto originali: ${mb(pdfBefore.length)}, ${pageCount(pdfBefore)} pagine, ${imageCount(pdfBefore)} immagini`,
        `PDF con le foto compresse: ${mb(pdfAfter.length)}, ${pageCount(pdfAfter)} pagine, ${imageCount(pdfAfter)} immagini`,
      ].join('\n')
    );
  }, 280_000);

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('la copertina, il testo e tutte le 15 foto finiscono nel PDF, prima e dopo la compressione', () => {
    for (const pdf of [pdfBefore, pdfAfter]) {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(imageCount(pdf)).toBe(PHOTO_COUNT + 1); // 15 foto più la copertina
      expect(pageCount(pdf)).toBeGreaterThanOrEqual(PHOTO_COUNT + 1);
    }
  });

  it('il numero di pagine non cambia: la compressione non sposta né perde foto', () => {
    expect(pageCount(pdfAfter)).toBe(pageCount(pdfBefore));
    expect(imageCount(pdfAfter)).toBe(imageCount(pdfBefore));
  });

  it('il PDF con le foto compresse pesa molto meno di quello con le foto di partenza', () => {
    expect(pdfAfter.length).toBeLessThan(pdfBefore.length * 0.6);
  });

  it('le foto sono davvero state ridotte (lato lungo 2560, senza metadati)', async () => {
    for (const c of compressed) {
      const m = await sharp(c).metadata();
      expect(Math.max(m.width ?? 0, m.height ?? 0)).toBe(2560);
      expect(m.exif).toBeUndefined();
    }
  });
});
