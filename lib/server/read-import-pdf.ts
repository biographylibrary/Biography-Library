import { createCanvas } from '@napi-rs/canvas';
import { coverFitsB5, fontStyleFlags, spansToHtml, type PdfSpan } from '@/lib/import/pdf-text';
import { renderPdfFirstPageToJpegBuffer, loadPdfJs } from '@/lib/server/render-pdf-first-page-jpeg';
import { brandHex } from '@/lib/ui-palette';

const COVER_W = 1050;
const COVER_H = Math.round((COVER_W * 250) / 176);
const BEIGE = brandHex.beigeBg;

export interface ImportPdfRead {
  hasText: boolean;
  bodyHasText: boolean;
  htmlAll: string;
  htmlAfterCover: string;
  /** First page as it is, for the question. Absent when the file has no selectable text. */
  previewJpeg: Buffer | null;
  /** Page ready to save: full bleed, or contained on the beige book color. */
  coverJpeg: Buffer | null;
}

async function pageSpans(
  page: { getTextContent: () => Promise<{ items: unknown[]; styles?: Record<string, { fontFamily?: string }> }> }
): Promise<PdfSpan[]> {
  const content = await page.getTextContent();
  const styles = content.styles ?? {};
  const spans: PdfSpan[] = [];
  for (const raw of content.items) {
    const item = raw as {
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
      fontName?: string;
    };
    if (!item.str || !item.transform) continue;
    const transform = item.transform;
    const size = Math.hypot(transform[2] ?? 0, transform[3] ?? 0) || item.height || 12;
    const family = styles[item.fontName ?? '']?.fontFamily || item.fontName || '';
    const flags = fontStyleFlags(family);
    spans.push({
      text: item.str,
      x: transform[4] ?? 0,
      y: transform[5] ?? 0,
      width: item.width ?? 0,
      size,
      bold: flags.bold,
      italic: flags.italic,
    });
  }
  return spans;
}

// pdf.js render parameters are stricter than the canvas we pass; the call matches the existing JPEG renderer.
async function renderContainedCover(page: any): Promise<Buffer> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(COVER_W / base.width, COVER_H / base.height);
  const viewport = page.getViewport({ scale });
  const pageCanvas = createCanvas(Math.max(1, Math.ceil(viewport.width)), Math.max(1, Math.ceil(viewport.height)));
  const pageCtx = pageCanvas.getContext('2d');
  await page.render({
    canvasContext: pageCtx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const canvas = createCanvas(COVER_W, COVER_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BEIGE;
  ctx.fillRect(0, 0, COVER_W, COVER_H);
  const x = (COVER_W - viewport.width) / 2;
  const y = (COVER_H - viewport.height) / 2;
  ctx.drawImage(pageCanvas, x, y, viewport.width, viewport.height);
  return canvas.toBuffer('image/jpeg', 85);
}

export async function readImportPdf(pdfBytes: ArrayBuffer): Promise<ImportPdfRead> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(pdfBytes);
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const htmlPages: string[] = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number);
    htmlPages.push(spansToHtml(await pageSpans(page)));
  }

  const htmlAll = htmlPages.filter(Boolean).join('');
  const htmlAfterCover = htmlPages.slice(1).filter(Boolean).join('');
  const plain = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain(htmlAll).length === 0) {
    return {
      hasText: false,
      bodyHasText: false,
      htmlAll: '',
      htmlAfterCover: '',
      previewJpeg: null,
      coverJpeg: null,
    };
  }

  const first = await pdf.getPage(1);
  const viewport = first.getViewport({ scale: 1 });
  const coverJpeg = coverFitsB5(viewport.width, viewport.height)
    ? await renderPdfFirstPageToJpegBuffer(pdfBytes, { scale: 2, quality: 0.85 })
    : await renderContainedCover(first);
  const previewJpeg = await renderPdfFirstPageToJpegBuffer(pdfBytes, { scale: 1.25, quality: 0.8 });

  return {
    hasText: true,
    bodyHasText: plain(htmlAfterCover).length > 0,
    htmlAll,
    htmlAfterCover,
    previewJpeg,
    coverJpeg,
  };
}
