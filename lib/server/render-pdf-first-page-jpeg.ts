import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** pdf.js in Node cerca `canvas` (node-canvas) per questi global; li forniamo da @napi-rs/canvas. */
if (!globalThis.DOMMatrix) {
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrix }).DOMMatrix = DOMMatrix;
}
if (!globalThis.Path2D) {
  (globalThis as unknown as { Path2D: typeof Path2D }).Path2D = Path2D;
}

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const workerPath = path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
      );
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/**
 * Rasterizza la prima pagina di un PDF in JPEG (server-side, Node).
 * Usa @napi-rs/canvas al posto di node-canvas per evitare build native problematiche.
 */
export async function renderPdfFirstPageToJpegBuffer(
  pdfBytes: ArrayBuffer,
  options?: { scale?: number; quality?: number }
): Promise<Buffer> {
  const scale = options?.scale ?? 2;
  const quality = options?.quality ?? 0.85;

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(pdfBytes);
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const w = Math.max(1, Math.ceil(viewport.width));
  const h = Math.max(1, Math.ceil(viewport.height));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context');
  }

  const renderTask = page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  });
  await renderTask.promise;

  const q = Math.min(100, Math.max(1, Math.round(quality * 100)));
  return canvas.toBuffer('image/jpeg', q);
}
