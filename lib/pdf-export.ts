import jsPDF from 'jspdf';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COVER_BORDER,
  COVER_INNER_PAD,
  COVER_PAGE_W,
  COVER_PT_AUTHOR,
  COVER_PT_TITLE,
  computeCoverCompositeLayout,
  splitTitleAuthorLines,
} from '@/lib/pdf/cover-composite-layout';
import { rasterizeCoverPhotoRoundedBrowser } from '@/lib/pdf/cover-photo-raster';

type PdfSupabase = SupabaseClient<any, any, any>;
import { BIOGRAPHY_SECTIONS } from './editor-constants';
import { supabase } from './supabase';

/** Server-side PDF generation can inject the service-role client (cover/media/storage). */
let pdfSupabaseOverride: PdfSupabase | null = null;

export function setPdfExportSupabaseClient(client: PdfSupabase | null): void {
  pdfSupabaseOverride = client;
}

function getPdfSupabase(): PdfSupabase {
  return (pdfSupabaseOverride ?? supabase) as PdfSupabase;
}

export interface BiographyData {
  id?: string;
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  narrative_order?: string[] | null;
  final_version?: string | null;
  status?: string;
  created_at: string;
}

const DRAFT_WATERMARK_LABELS: Record<number, Record<string, string>> = {
  1: { en: 'DRAFT', it: 'BOZZA', fr: 'BROUILLON', de: 'ENTWURF' },
  2: { en: 'SECOND DRAFT', it: 'SECONDA BOZZA', fr: 'SECOND BROUILLON', de: 'ZWEITER ENTWURF' },
  3: {
    en: 'THIRD DRAFT — FINAL REVIEW',
    it: 'TERZA BOZZA — REVISIONE FINALE',
    fr: 'TROISIÈME BROUILLON — RÉVISION FINALE',
    de: 'DRITTER ENTWURF — ABSCHLIESSENDE ÜBERPRÜFUNG',
  },
};

function getDraftLabel(iteration: number, language: string): string {
  const labels = DRAFT_WATERMARK_LABELS[iteration];
  if (!labels) return '';
  return labels[language] ?? labels['en'];
}

function drawDraftWatermark(doc: jsPDF, label: string): void {
  const docAny = doc as any;
  const savedGState = typeof docAny.saveGraphicsState === 'function';
  if (savedGState) docAny.saveGraphicsState();

  doc.setFont('NotoSerif', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(200, 50, 50);

  const centerX = B5_W / 2;
  const centerY = B5_H / 2;

  docAny.setGState ? docAny.setGState(new (docAny.GState ?? Object)({ opacity: 0.12 })) : null;

  doc.text(label, centerX, centerY, {
    align: 'center',
    angle: 45,
  });

  if (savedGState) docAny.restoreGraphicsState();

  doc.setFont('NotoSerif', 'normal');
  doc.setTextColor(0, 0, 0);
}

interface BookStructure {
  /** When true, insert the short credits leaf (author, date, «Created with …»); default false */
  include_author_copyright_page: boolean;
  dedication_content: string | null;
  dedication_enabled: boolean;
  epigraph_content: string | null;
  epigraph_source: string | null;
  epigraph_enabled: boolean;
  preface_content: string | null;
  preface_enabled: boolean;
  epilogue_content: string | null;
  epilogue_enabled: boolean;
  acknowledgements_content: string | null;
  acknowledgements_enabled: boolean;
  specific_credits_content: string | null;
  specific_credits_enabled: boolean;
}

export type PdfReadinessIssue =
  | 'missing-cover'
  | 'cover-unreachable'
  | 'missing-title'
  | 'missing-author'
  | 'missing-content'
  | 'missing-mode';

export function getPdfReadinessMessage(issue: PdfReadinessIssue, noCoverPhotoWarning?: string): string {
  switch (issue) {
    case 'missing-cover': return noCoverPhotoWarning ?? 'A cover photo is required.';
    case 'cover-unreachable': return 'Cover photo cannot be reached. Please re-upload.';
    case 'missing-title': return 'A biography title is required.';
    case 'missing-author': return 'An author name is required.';
    case 'missing-content': return 'At least one section must have content.';
    case 'missing-mode': return 'Biography mode is not set.';
    default: return issue;
  }
}

const B5_W = 176;
const B5_H = 250;

/** Reset page MediaBox after cover drawing — oversized addImage can widen page 1 in some viewers. */
function enforceB5PageDimensions(doc: jsPDF): void {
  const internal = (doc as any).internal;
  if (!internal) return;
  const pageNum = internal.getNumberOfPages?.() ?? 1;
  if (typeof internal.setPage === 'function') {
    internal.setPage(pageNum);
  }
  const ps = internal.pageSize;
  if (ps) {
    if (typeof ps.setWidth === 'function' && typeof ps.setHeight === 'function') {
      ps.setWidth(B5_W);
      ps.setHeight(B5_H);
    } else {
      ps.width = B5_W;
      ps.height = B5_H;
    }
  }
}

const SAFE_MARGIN = 5;

const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;
const MARGIN_INNER = 20;
const MARGIN_OUTER = 15;

/** Extra mm from inner text top for free-flow body paragraphs (lighter layout, no running title) */
const FREEFLOW_EXTRA_TOP_MARGIN_MM = 10;

/**
 * Narrative section pages: repeat section title in small grey at the page top (running header).
 * Default false — only body text and page numbers in the content block area.
 */
const PDF_DRAW_SECTION_RUNNING_HEADER = false;

/** Section-mode chapter title start Y (large heading); clears top margin */
const SECTION_HEADING_TOP_MM = MARGIN_TOP + 12;
const CHAPTER_HEADING_BODY_GAP_MM = 6;

const PT_BODY = 11;
const PT_CHAPTER = 22;
const PT_RUNNING = 9;
const PT_PAGE_NUM = 10;
const PT_CREDITS = 9;
const PT_TITLE_PAGE_TITLE = 28;
const PT_TITLE_PAGE_AUTHOR = 11;

const LINE_HEIGHT_BODY = 1.6;

const LOGO_SVG_PATH =
  'M173.05,321.36c6.48,4.65 12.13,9.91 16.82,15.70c25.72,-15.43 47.63,-35.95 64.62,-59.97c9.84,-13.95 18.06,-29.07 24.37,-45.04l3.94,-10.87c5.76,-17.31 9.39,-35.51 10.56,-54.26l0.12,-7.75l-96.15,-0.05c-1.83,3.74 -4.03,7.38 -6.59,10.88c-8.53,11.66 -20.82,21.46 -35.54,28.34c-1.14,0.54 -2.26,1.10 -3.36,1.67c-0.15,0.06 -0.29,0.14 -0.43,0.22c-23.46,12.32 -37.78,33.04 -37.66,54.91c0.06,10.83 3.71,21.62 10.54,31.22c5.42,7.60 12.75,14.33 21.46,19.73c-3.78,1.91 -7.41,4.01 -10.85,6.27c-7.29,-5.17 -13.52,-11.14 -18.54,-17.80c-8.93,-11.82 -13.68,-25.44 -13.76,-39.36c-0.07,-13.93 4.53,-27.59 13.31,-39.51c8.38,-11.37 20.35,-20.90 34.61,-27.56c9.71,-4.54 18.05,-10.41 24.68,-17.18c3.63,-3.70 6.75,-7.67 9.32,-11.84l-63.13,-0.03c5.50,8.87 13.56,16.82 23.75,23.19c-3.80,1.87 -7.45,3.95 -10.90,6.20c-7.35,-5.27 -13.62,-11.32 -18.65,-18.05c-2.72,-3.64 -5.05,-7.43 -6.98,-11.35l-94.79,-0.05l0.12,7.89c1.17,18.75 4.80,36.95 10.56,54.26l4.90,13.71h0.19c6.15,14.93 13.97,29.08 23.23,42.20c17.17,24.28 39.37,44.99 65.46,60.47c8.43,-10.67 20.06,-19.64 33.81,-26.07c1.19,-0.55 2.35,-1.14 3.49,-1.73c0.08,-0.04 0.15,-0.07 0.22,-0.11c23.50,-12.31 37.86,-33.05 37.74,-54.95c-0.06,-10.13 -3.25,-20.22 -9.25,-29.34c-0.01,-0.01 -0.02,-0.03 -0.03,-0.05c-0.41,-0.61 -0.83,-1.22 -1.25,-1.83c-5.41,-7.60 -12.75,-14.32 -21.46,-19.72c3.78,-1.91 7.41,-4.01 10.87,-6.29c7.29,5.17 13.52,11.14 18.54,17.79c8.92,11.83 13.68,25.44 13.76,39.36c0.07,13.92 -4.53,27.59 -13.32,39.51c-8.37,11.37 -20.34,20.91 -34.61,27.57c-1.51,0.70 -2.98,1.45 -4.42,2.21c-0.05,0.02 -0.10,0.05 -0.15,0.08c-9.66,5.16 -17.77,11.71 -23.96,19.14c6.71,3.51 13.65,6.69 20.81,9.51l4.59,1.43l4.59,-1.43c7.48,-2.94 14.72,-6.28 21.71,-9.98c-4.84,-5.63 -10.82,-10.73 -17.79,-15.10c3.80,-1.88 7.44,-3.95 10.90,-6.20zM293.77,140.32v-35.28c-49.86,-2.05 -89.98,-42.58 -91.35,-92.61h-43.52c1.40,73.97 60.94,133.98 134.74,136.12zM293.77,85.44v-10.65v-23.68c-20.16,-1.92 -36.17,-18.33 -37.47,-38.67h-43.57c1.37,44.35 36.86,80.26 81.04,82.29zM293.77,12.43h-27.15c1.25,14.66 12.67,26.46 27.15,28.30zM158.72,148.88l85.17,0c-38.93,-15.11 -69.98,-46.12 -85.17,-85.01zM148.57,12.43h-135.05v62.35h0.03v10.65h-0.03v54.89l0.13,8.55l134.92,0zM152.79,365.60c-0.11,-0.03 -0.23,-0.07 -0.35,-0.10c-44.84,-15.94 -82.27,-45.08 -108.49,-82.16c-11.86,-16.76 -21.42,-35.13 -28.35,-54.64l-0.17,-0.55c-8.33,-23.55 -12.79,-48.74 -12.79,-74.73V7.02c0,-2.98 2.43,-5.42 5.42,-5.42h291.16c2.98,0 5.42,2.43 5.42,5.42v146.40c0,25.98 -4.46,51.18 -12.79,74.73l-0.17,0.55c-6.92,19.50 -16.49,37.88 -28.35,54.64c-26.22,37.09 -63.65,66.22 -108.49,82.16c-0.24,0.07 -0.95,0.27 -1.20,0.27c-0.40,0 -0.85,-0.17 -0.85,-0.17zM81.01,133.29c-29.06,0 -52.61,-23.55 -52.61,-52.61c0,-29.06 23.55,-52.61 52.61,-52.61c29.06,0 52.61,23.55 52.61,52.61c0,29.06 -23.55,52.61 -52.61,52.61zM123.20,80.68c0,-23.30 -18.89,-42.20 -42.20,-42.20c-23.30,0 -42.20,18.89 -42.20,42.20c0,23.30 18.89,42.20 42.20,42.20c23.30,0 42.20,-18.89 42.20,-42.20z';

const LOGO_SVG_VB_W = 306.49;
const LOGO_SVG_VB_H = 368.28;

let notoSerifRegularBase64: string | null = null;
let notoSerifBoldBase64: string | null = null;
let notoSerifItalicBase64: string | null = null;
let notoSerifBoldItalicBase64: string | null = null;
let fontsLoaded = false;

export function stripHtml(html: string): string {
  if (!html) return '';
  let text = html;
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/[ \t]+/g, ' ');
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

async function loadNotoSerifFonts(): Promise<void> {
  if (fontsLoaded) return;

  if (typeof window === 'undefined') {
    const { readFile } = await import('fs/promises');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'public', 'fonts', 'noto-serif');
    const files = [
      'NotoSerif-Regular.ttf',
      'NotoSerif-Bold.ttf',
      'NotoSerif-Italic.ttf',
      'NotoSerif-BoldItalic.ttf',
    ];
    const buffers = await Promise.all(files.map((f) => readFile(path.join(dir, f))));
    for (const buf of buffers) {
      if (buf.byteLength < 50000) {
        throw new Error('FONT_LOAD_FAILED');
      }
    }
    const toAb = (b: typeof buffers[0]) =>
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    notoSerifRegularBase64 = arrayBufferToBase64(toAb(buffers[0]));
    notoSerifBoldBase64 = arrayBufferToBase64(toAb(buffers[1]));
    notoSerifItalicBase64 = arrayBufferToBase64(toAb(buffers[2]));
    notoSerifBoldItalicBase64 = arrayBufferToBase64(toAb(buffers[3]));
    fontsLoaded = true;
    return;
  }

  const base = '/fonts/noto-serif';
  const urls = [
    `${base}/NotoSerif-Regular.ttf`,
    `${base}/NotoSerif-Bold.ttf`,
    `${base}/NotoSerif-Italic.ttf`,
    `${base}/NotoSerif-BoldItalic.ttf`,
  ];

  const responses = await Promise.all(urls.map((url) => fetch(url)));

  for (const resp of responses) {
    if (!resp.ok) {
      throw new Error('FONT_LOAD_FAILED');
    }
  }

  const buffers = await Promise.all(responses.map((r) => r.arrayBuffer()));

  for (const buf of buffers) {
    if (buf.byteLength < 50000) {
      throw new Error('FONT_LOAD_FAILED');
    }
  }

  notoSerifRegularBase64 = arrayBufferToBase64(buffers[0]);
  notoSerifBoldBase64 = arrayBufferToBase64(buffers[1]);
  notoSerifItalicBase64 = arrayBufferToBase64(buffers[2]);
  notoSerifBoldItalicBase64 = arrayBufferToBase64(buffers[3]);
  fontsLoaded = true;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function registerFonts(doc: jsPDF): void {
  if (
    !notoSerifRegularBase64 ||
    !notoSerifBoldBase64 ||
    !notoSerifItalicBase64 ||
    !notoSerifBoldItalicBase64
  ) {
    throw new Error('FONT_LOAD_FAILED');
  }
  doc.addFileToVFS('NotoSerif-Regular.ttf', notoSerifRegularBase64);
  doc.addFont('NotoSerif-Regular.ttf', 'NotoSerif', 'normal');
  doc.addFileToVFS('NotoSerif-Bold.ttf', notoSerifBoldBase64);
  doc.addFont('NotoSerif-Bold.ttf', 'NotoSerif', 'bold');
  doc.addFileToVFS('NotoSerif-Italic.ttf', notoSerifItalicBase64);
  doc.addFont('NotoSerif-Italic.ttf', 'NotoSerif', 'italic');
  doc.addFileToVFS('NotoSerif-BoldItalic.ttf', notoSerifBoldItalicBase64);
  doc.addFont('NotoSerif-BoldItalic.ttf', 'NotoSerif', 'bolditalic');
}

function applyFont(doc: jsPDF, style: 'normal' | 'italic' | 'bold' | 'bolditalic' = 'normal') {
  doc.setFont('NotoSerif', style);
}

function ptToMm(pt: number): number {
  return pt / 2.8346456693;
}

function formatBiographyDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Draw BL logo: raster PNG in the browser (reliable). On the server, never import
 * `@napi-rs/canvas` here — dynamic imports still get analyzed for the client bundle
 * and webpack tries to load native `.node` binaries. Server path uses jsPDF’s SVG
 * helper when present, else bold text.
 */
async function drawBiographyLibraryLogoMark(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  logoWmm: number,
  fillHex: string
): Promise<void> {
  const logoHmm = logoWmm * (LOGO_SVG_VB_H / LOGO_SVG_VB_W);
  const x = centerX - logoWmm / 2;
  const y = centerY - logoHmm / 2;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const svgRaster = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="616" viewBox="0 0 ${LOGO_SVG_VB_W} ${LOGO_SVG_VB_H}"><path fill="${fillHex}" d="${LOGO_SVG_PATH}"/></svg>`;
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgRaster)}`;
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('logo svg raster decode'));
        im.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas ctx');
      ctx.drawImage(img, 0, 0);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, logoWmm, logoHmm);
      return;
    } catch {
      drawLogoFallback(doc, centerX, centerY);
      return;
    }
  }

  const svgStr = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${logoWmm}mm" height="${logoHmm}mm"`,
    ` viewBox="0 0 ${LOGO_SVG_VB_W} ${LOGO_SVG_VB_H}">`,
    `<path fill="${fillHex}" d="${LOGO_SVG_PATH}"/>`,
    `</svg>`,
  ].join('');
  try {
    const anyDoc = doc as any;
    if (typeof anyDoc.addSvgAsImage === 'function') {
      anyDoc.addSvgAsImage(svgStr, x, y, logoWmm, logoHmm);
      return;
    }
  } catch {
    /* fall through */
  }
  drawLogoFallback(doc, centerX, centerY);
}

/** Raster/text fallback when SVG import is unavailable (common in some jsPDF runtimes). */
function drawLogoFallback(doc: jsPDF, centerX: number, centerY: number): void {
  applyFont(doc, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0x12, 0x12, 0x12);
  doc.text('Biography Library', centerX, centerY, { align: 'center' });
}

function isOddPage(absolutePage: number): boolean {
  return absolutePage % 2 === 1;
}

function innerMarginForPage(absolutePage: number): number {
  return isOddPage(absolutePage) ? MARGIN_INNER : MARGIN_OUTER;
}

function outerMarginForPage(absolutePage: number): number {
  return isOddPage(absolutePage) ? MARGIN_OUTER : MARGIN_INNER;
}

function textStartX(absolutePage: number): number {
  return innerMarginForPage(absolutePage);
}

function textAvailableWidth(absolutePage: number): number {
  return B5_W - innerMarginForPage(absolutePage) - outerMarginForPage(absolutePage);
}

function bodyLineH(): number {
  return ptToMm(PT_BODY * LINE_HEIGHT_BODY);
}

interface PdfState {
  doc: jsPDF;
  absolutePage: number;
  contentPageNum: number;
  watermarkLabel?: string | null;
}

function addNewPage(state: PdfState, isContent: boolean): void {
  const { doc } = state;
  doc.addPage([B5_W, B5_H]);
  state.absolutePage++;
  if (isContent) {
    state.contentPageNum++;
  }
  if (state.watermarkLabel) {
    drawDraftWatermark(doc, state.watermarkLabel);
  }
}

function drawRunningHeader(state: PdfState, title: string): void {
  const { doc, absolutePage } = state;
  applyFont(doc, 'normal');
  doc.setFontSize(PT_RUNNING);
  doc.setTextColor(120, 120, 120);
  const headerY = 8;

  if (isOddPage(absolutePage)) {
    doc.text(title, B5_W - MARGIN_OUTER, headerY, { align: 'right' });
  } else {
    doc.text(title, MARGIN_OUTER, headerY, { align: 'left' });
  }
}

function drawPageNumber(state: PdfState): void {
  const { doc, contentPageNum } = state;
  applyFont(doc, 'normal');
  doc.setFontSize(PT_PAGE_NUM);
  doc.setTextColor(80, 80, 80);
  const numY = B5_H - 10;
  const centerX = B5_W / 2;
  doc.text(String(contentPageNum), centerX, numY, { align: 'center' });
}

function ensureOddPage(state: PdfState): void {
  if (!isOddPage(state.absolutePage)) {
    addNewPage(state, false);
  }
}

function renderTextBlock(
  state: PdfState,
  text: string,
  fontSize: number,
  lineHeightMultiplier: number,
  startY: number,
  textAreaBottom: number,
  fontStyle: 'normal' | 'italic',
  sectionTitle?: string,
  drawHeaderAndNum?: (s: PdfState) => void
): void {
  const { doc } = state;
  const lineH = ptToMm(fontSize * lineHeightMultiplier);

  applyFont(doc, fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  let y = startY;
  const cleanText = stripHtml(text);
  const paragraphs = cleanText.split(/\n\n+/);

  for (const para of paragraphs) {
    if (!para.trim()) continue;

    const tw = textAvailableWidth(state.absolutePage);
    const lines = doc.splitTextToSize(para.trim(), tw);

    for (const line of lines) {
      if (y + lineH > textAreaBottom) {
        addNewPage(state, true);
        if (drawHeaderAndNum) {
          drawHeaderAndNum(state);
        } else if (sectionTitle) {
          drawRunningHeader(state, sectionTitle);
          drawPageNumber(state);
        }
        applyFont(doc, fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
        y = MARGIN_TOP;
      }
      doc.text(line, textStartX(state.absolutePage), y);
      y += lineH;
    }
    y += lineH * 0.4;
  }
}

function addDedicationPage(state: PdfState, content: string): void {
  ensureOddPage(state);

  const { doc } = state;
  applyFont(doc, 'italic');
  doc.setFontSize(PT_BODY);
  doc.setTextColor(0, 0, 0);

  const clean = stripHtml(content);
  const tw = textAvailableWidth(state.absolutePage);
  const lines = doc.splitTextToSize(clean.trim(), tw);
  const centerX = B5_W / 2;
  const startY = 70;
  const lineH = ptToMm(PT_BODY * LINE_HEIGHT_BODY);

  lines.forEach((line: string, i: number) => {
    doc.text(line, centerX, startY + i * lineH, { align: 'center' });
  });
}

function addEpigraphPage(state: PdfState, content: string, source: string | null): void {
  ensureOddPage(state);

  const { doc } = state;
  applyFont(doc, 'italic');
  doc.setFontSize(PT_BODY);
  doc.setTextColor(0, 0, 0);

  const clean = stripHtml(content);
  const tw = textAvailableWidth(state.absolutePage);
  const lines = doc.splitTextToSize(clean.trim(), tw);
  const centerX = B5_W / 2;
  const startY = 70;
  const lineH = ptToMm(PT_BODY * LINE_HEIGHT_BODY);

  lines.forEach((line: string, i: number) => {
    doc.text(line, centerX, startY + i * lineH, { align: 'center' });
  });

  if (source && source.trim()) {
    const cleanSource = stripHtml(source);
    const sourceY = startY + lines.length * lineH + lineH * 0.8;
    applyFont(doc, 'normal');
    doc.setFontSize(PT_BODY - 1);
    doc.setTextColor(100, 100, 100);
    doc.text(`— ${cleanSource.trim()}`, centerX, sourceY, { align: 'center' });
  }
}

function addSectionWithTitle(
  state: PdfState,
  sectionTitle: string,
  content: string,
  fontSize: number,
  lineHeightMultiplier: number,
  drawRunningHeaderFn: boolean
): void {
  const textAreaTop = MARGIN_TOP;
  const textAreaBottom = B5_H - MARGIN_BOTTOM;

  ensureOddPage(state);

  const { doc } = state;
  const tx = textStartX(state.absolutePage);
  const chapterTitleStartY = Math.max(textAreaTop + 10, SECTION_HEADING_TOP_MM);
  const headingWidth = textAvailableWidth(state.absolutePage);
  const headingLineH = ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY);

  applyFont(doc, 'normal');
  doc.setFontSize(PT_CHAPTER);
  doc.setTextColor(0, 0, 0);
  const headingLines = doc.splitTextToSize(sectionTitle, headingWidth) as string[];
  headingLines.forEach((line, i) => {
    doc.text(line, tx, chapterTitleStartY + i * headingLineH);
  });

  state.contentPageNum++;

  if (drawRunningHeaderFn) {
    drawRunningHeader(state, sectionTitle);
  }
  drawPageNumber(state);

  const bodyStartY =
    chapterTitleStartY + headingLines.length * headingLineH + CHAPTER_HEADING_BODY_GAP_MM;

  const drawHeader = drawRunningHeaderFn
    ? (s: PdfState) => {
        drawRunningHeader(s, sectionTitle);
        drawPageNumber(s);
      }
    : (s: PdfState) => {
        drawPageNumber(s);
      };

  renderTextBlock(
    state,
    content,
    fontSize,
    lineHeightMultiplier,
    bodyStartY,
    textAreaBottom,
    'normal',
    sectionTitle,
    drawHeader
  );
}

async function fetchBookStructure(biographyId: string): Promise<BookStructure | null> {
  try {
    const { data, error } = await getPdfSupabase()
      .from('biography_book_structure')
      .select('*')
      .eq('biography_id', biographyId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as BookStructure & { include_author_copyright_page?: boolean };
    return {
      ...row,
      include_author_copyright_page: row.include_author_copyright_page === true,
    };
  } catch {
    return null;
  }
}

function hasContent(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return stripHtml(value).trim().length > 0;
}

/** True when at least one front-matter PDF page should render (toggle on + non-empty body). */
function hasPdfFrontMatter(bs: BookStructure): boolean {
  return (
    (bs.dedication_enabled && hasContent(bs.dedication_content)) ||
    (bs.epigraph_enabled && hasContent(bs.epigraph_content)) ||
    (bs.preface_enabled && hasContent(bs.preface_content))
  );
}

/** Data URI prefix for jsPDF `getImageProperties()` / aspect ratio logic. */
function coverBase64ToDataUri(base64: string, coverFormat: string): string {
  const f = coverFormat.toUpperCase();
  const sub =
    f === 'PNG'
      ? 'png'
      : f === 'WEBP'
        ? 'webp'
        : f === 'GIF'
          ? 'gif'
          : 'jpeg';
  return `data:image/${sub};base64,${base64}`;
}

/** Optional server hook — registered from `lib/server/register-pdf-cover-rasterizer.ts` only. */
export type CoverPhotoRasterizer = (
  coverBase64: string,
  outputWidthPx: number,
  outputHeightPx: number,
  cornerRadiusPx: number
) => Promise<{ dataUrl: string; format: string }>;

let coverPhotoRasterizer: CoverPhotoRasterizer | null = null;

export function setCoverPhotoRasterizer(fn: CoverPhotoRasterizer | null): void {
  coverPhotoRasterizer = fn;
}

/** Ordered PDF assembly trace (debug blank-page issues). */
function logPdfBuildStep(step: string): void {
  console.log('[PDF build]', step);
}

async function resolveCoverImagePixelDimensions(
  doc: jsPDF,
  base64: string,
  format: string
): Promise<{ width: number; height: number }> {
  const uri = coverBase64ToDataUri(base64, format);
  let gpW = 0;
  let gpH = 0;
  try {
    const props = doc.getImageProperties(uri);
    gpW = Number(props.width) || 0;
    gpH = Number(props.height) || 0;
    console.log('[drawPhotoCover] getImageProperties', gpW, gpH);
  } catch (e) {
    console.warn('[drawPhotoCover] getImageProperties failed', e);
  }

  /** Prefer decode-based dimensions — jsPDF often misreports PNG/WebP sizes. */
  if (typeof window !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        console.log('[drawPhotoCover] HTMLImageElement', imgWidth, imgHeight);
        if (imgWidth > 0 && imgHeight > 0) {
          resolve({ width: imgWidth, height: imgHeight });
          return;
        }
        if (gpW > 0 && gpH > 0) resolve({ width: gpW, height: gpH });
        else resolve({ width: 1, height: 1 });
      };
      img.onerror = () => {
        if (gpW > 0 && gpH > 0) resolve({ width: gpW, height: gpH });
        else reject(new Error('cover image decode failed'));
      };
      img.src = uri;
    });
  }

  const cleanB64 = base64.replace(/\s/g, '');
  const sizeOf = (await import('image-size')).default;
  const buffer = Buffer.from(cleanB64, 'base64');
  const dims = sizeOf(buffer);
  const imgWidth = dims.width ?? 0;
  const imgHeight = dims.height ?? 0;
  console.log('[drawPhotoCover] image-size', imgWidth, imgHeight);
  if (imgWidth > 0 && imgHeight > 0) {
    return { width: imgWidth, height: imgHeight };
  }
  if (gpW > 0 && gpH > 0) {
    return { width: gpW, height: gpH };
  }
  return { width: 1, height: 1 };
}

function detectImageFormat(url: string, contentType: string | null): string {
  if (contentType) {
    if (contentType.includes('png')) return 'PNG';
    if (contentType.includes('webp')) return 'WEBP';
    if (contentType.includes('gif')) return 'GIF';
  }
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  if (ext === 'gif') return 'GIF';
  return 'JPEG';
}

function storagePathFromFileUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/biography-photos/');
    if (parts[1]) return parts[1];
  } catch {
  }
  return fileUrl;
}

async function resolveSignedUrl(fileUrl: string): Promise<string> {
  const storagePath = storagePathFromFileUrl(fileUrl);
  const { data } = await getPdfSupabase().storage
    .from('biography-photos')
    .createSignedUrl(storagePath, 300);
  if (data?.signedUrl) return data.signedUrl;
  return fileUrl;
}

/** Signed URL for the cover image (web display), or null if none. Prefer composite `cover`, then `cover_a5`. */
export async function getCoverPhotoDisplayUrl(biographyId: string): Promise<string | null> {
  const { data } = await getPdfSupabase()
    .from('biography_media')
    .select('file_url, layout')
    .eq('biography_id', biographyId)
    .in('layout', ['cover', 'cover_a5'])
    .order('layout', { ascending: true })
    .limit(2);
  const rows = (data as { file_url: string; layout: string }[] | null) ?? [];
  const preferCover = rows.find((r) => r.layout === 'cover') ?? rows.find((r) => r.layout === 'cover_a5');
  if (!preferCover?.file_url) return null;
  try {
    return await resolveSignedUrl(preferCover.file_url);
  } catch {
    return null;
  }
}

interface GalleryPhoto {
  id: string;
  file_url: string;
  caption: string | null;
  layout: string;
  display_order: number;
}

async function fetchGalleryPhotos(biographyId: string): Promise<GalleryPhoto[]> {
  const { data } = await getPdfSupabase()
    .from('biography_media')
    .select('id, file_url, caption, layout, display_order')
    .eq('biography_id', biographyId)
    .in('layout', ['full-page', 'two-vertical', 'two-horizontal', 'three-mixed'])
    .order('display_order', { ascending: true });

  return (data as GalleryPhoto[] | null) ?? [];
}

async function fetchPhotoBase64(fileUrl: string): Promise<{ base64: string; format: string } | null> {
  try {
    const url = await resolveSignedUrl(fileUrl);
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type');
    const format = detectImageFormat(url, contentType);
    const buf = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    return { base64, format };
  } catch {
    return null;
  }
}

const PT_CAPTION = 9;

function renderFullPagePhoto(
  state: PdfState,
  base64: string,
  format: string,
  caption: string | null
): void {
  addNewPage(state, false);

  const { doc } = state;
  const photoX = MARGIN_INNER;
  const photoW = B5_W - MARGIN_INNER - MARGIN_OUTER;
  const captionH = caption?.trim() ? ptToMm(PT_CAPTION * LINE_HEIGHT_BODY) + 3 : 0;
  const photoH = B5_H - MARGIN_TOP - MARGIN_BOTTOM - captionH;

  doc.addImage(base64, format, photoX, MARGIN_TOP, photoW, photoH);

  if (caption?.trim()) {
    const captionY = MARGIN_TOP + photoH + 3;
    applyFont(doc, 'italic');
    doc.setFontSize(PT_CAPTION);
    doc.setTextColor(80, 80, 80);
    const captionLines = doc.splitTextToSize(caption.trim(), photoW) as string[];
    const lineH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY);
    captionLines.forEach((line: string, i: number) => {
      doc.text(line, photoX + photoW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
}

function renderTwoVerticalPhotos(
  state: PdfState,
  photoA: { base64: string; format: string; caption: string | null },
  photoB: { base64: string; format: string; caption: string | null } | null
): void {
  addNewPage(state, false);

  const { doc } = state;
  const totalW = B5_W - MARGIN_INNER - MARGIN_OUTER;
  const GAP = 4;
  const photoW = (totalW - GAP) / 2;
  const captionH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY) + 3;
  const photoH = B5_H - MARGIN_TOP - MARGIN_BOTTOM - captionH;

  const leftX = MARGIN_INNER;
  const rightX = MARGIN_INNER + photoW + GAP;

  doc.addImage(photoA.base64, photoA.format, leftX, MARGIN_TOP, photoW, photoH);
  if (photoB) {
    doc.addImage(photoB.base64, photoB.format, rightX, MARGIN_TOP, photoW, photoH);
  }

  const captionY = MARGIN_TOP + photoH + 3;
  applyFont(doc, 'italic');
  doc.setFontSize(PT_CAPTION);
  doc.setTextColor(80, 80, 80);
  const lineH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY);

  if (photoA.caption?.trim()) {
    const lines = doc.splitTextToSize(photoA.caption.trim(), photoW) as string[];
    lines.forEach((line: string, i: number) => {
      doc.text(line, leftX + photoW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
  if (photoB?.caption?.trim()) {
    const lines = doc.splitTextToSize(photoB.caption.trim(), photoW) as string[];
    lines.forEach((line: string, i: number) => {
      doc.text(line, rightX + photoW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
}

function renderTwoHorizontalPhotos(
  state: PdfState,
  photoA: { base64: string; format: string; caption: string | null },
  photoB: { base64: string; format: string; caption: string | null } | null
): void {
  addNewPage(state, false);

  const { doc } = state;
  const totalW = B5_W - MARGIN_INNER - MARGIN_OUTER;
  const GAP = 4;
  const captionH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY) + 3;
  const photoH = (B5_H - MARGIN_TOP - MARGIN_BOTTOM - GAP - captionH * 2) / 2;

  const topY = MARGIN_TOP;
  const bottomY = MARGIN_TOP + photoH + GAP + captionH;

  doc.addImage(photoA.base64, photoA.format, MARGIN_INNER, topY, totalW, photoH);
  if (photoB) {
    doc.addImage(photoB.base64, photoB.format, MARGIN_INNER, bottomY, totalW, photoH);
  }

  applyFont(doc, 'italic');
  doc.setFontSize(PT_CAPTION);
  doc.setTextColor(80, 80, 80);
  const lineH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY);

  if (photoA.caption?.trim()) {
    const captionY = topY + photoH + 3;
    const lines = doc.splitTextToSize(photoA.caption.trim(), totalW) as string[];
    lines.forEach((line: string, i: number) => {
      doc.text(line, MARGIN_INNER + totalW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
  if (photoB?.caption?.trim()) {
    const captionY = bottomY + photoH + 3;
    const lines = doc.splitTextToSize(photoB.caption.trim(), totalW) as string[];
    lines.forEach((line: string, i: number) => {
      doc.text(line, MARGIN_INNER + totalW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
}

function renderThreeMixedPhotos(
  state: PdfState,
  photoA: { base64: string; format: string; caption: string | null },
  photoB: { base64: string; format: string; caption: string | null } | null,
  photoC: { base64: string; format: string; caption: string | null } | null
): void {
  addNewPage(state, false);

  const { doc } = state;
  const totalW = B5_W - MARGIN_INNER - MARGIN_OUTER;
  const GAP = 4;
  const captionH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY) + 3;
  const totalH = B5_H - MARGIN_TOP - MARGIN_BOTTOM - captionH;

  const topH = totalH * 0.55;
  const bottomH = totalH - topH - GAP;
  const halfW = (totalW - GAP) / 2;

  const topY = MARGIN_TOP;
  const bottomY = MARGIN_TOP + topH + GAP;

  doc.addImage(photoA.base64, photoA.format, MARGIN_INNER, topY, totalW, topH);
  if (photoB) {
    doc.addImage(photoB.base64, photoB.format, MARGIN_INNER, bottomY, halfW, bottomH);
  }
  if (photoC) {
    doc.addImage(photoC.base64, photoC.format, MARGIN_INNER + halfW + GAP, bottomY, halfW, bottomH);
  }

  if (photoA.caption?.trim()) {
    applyFont(doc, 'italic');
    doc.setFontSize(PT_CAPTION);
    doc.setTextColor(80, 80, 80);
    const captionY = topY + topH + 1;
    const lines = doc.splitTextToSize(photoA.caption.trim(), totalW) as string[];
    const lineH = ptToMm(PT_CAPTION * LINE_HEIGHT_BODY);
    lines.forEach((line: string, i: number) => {
      doc.text(line, MARGIN_INNER + totalW / 2, captionY + i * lineH, { align: 'center' });
    });
  }
}

async function renderGalleryPhotosForSection(
  state: PdfState,
  photos: GalleryPhoto[]
): Promise<void> {
  let i = 0;
  while (i < photos.length) {
    const photo = photos[i];

    if (photo.layout === 'full-page') {
      const resolved = await fetchPhotoBase64(photo.file_url);
      if (resolved) {
        renderFullPagePhoto(state, resolved.base64, resolved.format, photo.caption);
      }
      i++;
    } else if (photo.layout === 'two-vertical') {
      const nextPhoto = i + 1 < photos.length && photos[i + 1].layout === 'two-vertical'
        ? photos[i + 1]
        : null;

      const resolvedA = await fetchPhotoBase64(photo.file_url);
      const resolvedB = nextPhoto ? await fetchPhotoBase64(nextPhoto.file_url) : null;

      if (resolvedA) {
        renderTwoVerticalPhotos(state, { ...resolvedA, caption: photo.caption }, resolvedB ? { ...resolvedB, caption: nextPhoto!.caption } : null);
      }
      i += nextPhoto ? 2 : 1;
    } else if (photo.layout === 'two-horizontal') {
      const nextPhoto = i + 1 < photos.length && photos[i + 1].layout === 'two-horizontal'
        ? photos[i + 1]
        : null;

      const resolvedA = await fetchPhotoBase64(photo.file_url);
      const resolvedB = nextPhoto ? await fetchPhotoBase64(nextPhoto.file_url) : null;

      if (resolvedA) {
        renderTwoHorizontalPhotos(state, { ...resolvedA, caption: photo.caption }, resolvedB ? { ...resolvedB, caption: nextPhoto!.caption } : null);
      }
      i += nextPhoto ? 2 : 1;
    } else if (photo.layout === 'three-mixed') {
      const photoB = i + 1 < photos.length && photos[i + 1].layout === 'three-mixed'
        ? photos[i + 1]
        : null;
      const photoC = photoB && i + 2 < photos.length && photos[i + 2].layout === 'three-mixed'
        ? photos[i + 2]
        : null;

      const resolvedA = await fetchPhotoBase64(photo.file_url);
      const resolvedB = photoB ? await fetchPhotoBase64(photoB.file_url) : null;
      const resolvedC = photoC ? await fetchPhotoBase64(photoC.file_url) : null;

      if (resolvedA) {
        renderThreeMixedPhotos(
          state,
          { ...resolvedA, caption: photo.caption },
          resolvedB ? { ...resolvedB, caption: photoB!.caption } : null,
          resolvedC ? { ...resolvedC, caption: photoC!.caption } : null
        );
      }
      i += (photoC ? 3 : photoB ? 2 : 1);
    } else {
      i++;
    }
  }
}

async function fetchMediaBase64ByLayout(
  biographyId: string,
  layout: string
): Promise<{ base64: string; format: string } | null> {
  const { data } = await getPdfSupabase()
    .from('biography_media')
    .select('file_url')
    .eq('biography_id', biographyId)
    .eq('layout', layout)
    .limit(1)
    .maybeSingle();

  if (!data?.file_url) return null;

  const url = await resolveSignedUrl(data.file_url);

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type');
    const format = detectImageFormat(url, contentType);
    const buf = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    return { base64, format };
  } catch {
    return null;
  }
}

async function fetchCoverCompositeOptional(
  biographyId: string
): Promise<{ base64: string; format: string } | null> {
  return fetchMediaBase64ByLayout(biographyId, 'cover');
}

async function fetchCoverA5Optional(biographyId: string): Promise<{ base64: string; format: string } | null> {
  return fetchMediaBase64ByLayout(biographyId, 'cover_a5');
}

function drawFullBleedCustomCover(
  doc: jsPDF,
  coverBase64: string,
  coverFormat: string
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, B5_W, B5_H, 'F');
  doc.addImage(coverBase64, coverFormat, 0, 0, B5_W, B5_H);
  enforceB5PageDimensions(doc);
}

async function drawPhotoCover(
  doc: jsPDF,
  title: string,
  authorName: string,
  coverBase64: string,
  coverFormat: string,
  imgDims: { width: number; height: number }
): Promise<void> {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, B5_W, B5_H, 'F');

  const innerWidth = COVER_PAGE_W - 2 * COVER_BORDER - 2 * COVER_INNER_PAD;
  applyFont(doc, 'normal');
  const { titleLines, authorLines } = splitTitleAuthorLines(doc, title, authorName, innerWidth);
  const layout = computeCoverCompositeLayout(titleLines.length, authorLines.length);
  const { titleCard, photoCard, textX, titleFirstBaselineY, cornerRadius } = layout;

  doc.setFillColor(0xec, 0xe9, 0xe4);
  doc.setDrawColor(0xec, 0xe9, 0xe4);
  (doc as any).roundedRect(
    titleCard.x,
    titleCard.y,
    titleCard.w,
    titleCard.h,
    cornerRadius,
    cornerRadius,
    'FD'
  );

  applyFont(doc, 'normal');
  doc.setFontSize(COVER_PT_TITLE);
  doc.setTextColor(0x12, 0x12, 0x12);
  let y = titleFirstBaselineY;
  for (const line of titleLines) {
    doc.text(line, textX, y);
    y += layout.lineHeightTitle;
  }
  y += layout.authorGap;

  applyFont(doc, 'normal');
  doc.setFontSize(COVER_PT_AUTHOR);
  doc.setTextColor(0x12, 0x12, 0x12);
  for (const line of authorLines) {
    doc.text(line, textX, y);
    y += layout.lineHeightAuthor;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  (doc as any).roundedRect(
    photoCard.x,
    photoCard.y,
    photoCard.w,
    photoCard.h,
    cornerRadius,
    cornerRadius,
    'FD'
  );

  const outputWPx = Math.max(400, Math.round(photoCard.w * 10));
  const outputHPx = Math.max(200, Math.round(photoCard.h * 10));
  const radiusPx = Math.max(1, Math.round((cornerRadius / photoCard.w) * outputWPx));

  const placePhoto = (dataUrl: string, format: string) => {
    doc.addImage(dataUrl, format, photoCard.x, photoCard.y, photoCard.w, photoCard.h);
  };

  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const raster = await rasterizeCoverPhotoRoundedBrowser(
        coverBase64,
        coverFormat,
        imgDims,
        outputWPx,
        outputHPx,
        radiusPx
      );
      placePhoto(raster.dataUrl, raster.format);
    } else if (coverPhotoRasterizer) {
      const raster = await coverPhotoRasterizer(coverBase64, outputWPx, outputHPx, radiusPx);
      placePhoto(raster.dataUrl, raster.format);
    } else {
      placePhoto(coverBase64, coverFormat);
    }
  } catch (e) {
    console.warn('[drawPhotoCover] raster failed, drawing fitted image', e);
    placePhoto(coverBase64, coverFormat);
  }

  enforceB5PageDimensions(doc);
}

async function drawBackCover(
  doc: jsPDF,
  authorName: string,
  backCoverDescription: string,
  backCoverPropertyStatement: string,
  backCoverAiStatement: string,
  backCoverFooter: string
): Promise<void> {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, B5_W, B5_H, 'F');

  const BORDER = 10;
  const CARD_W = 156;
  const CARD_H = 230;
  const CARD_X = BORDER;
  const CARD_Y = BORDER;
  const CARD_RADIUS = 5;
  const CARD_INNER_PADDING_X = 16;
  const CARD_INNER_PADDING_TOP = 32;
  const CARD_INNER_PADDING_BOTTOM = 28;
  const TEXT_X = CARD_X + CARD_INNER_PADDING_X;
  const TEXT_W = CARD_W - 2 * CARD_INNER_PADDING_X;
  const textCenterX = TEXT_X + TEXT_W / 2;
  const LOGO_TEXT_GAP = 5;
  const FOOTER_GAP_BEFORE = 4;

  doc.setFillColor(0xec, 0xe9, 0xe4);
  (doc as any).roundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, CARD_RADIUS, CARD_RADIUS, 'F');

  const LOGO_W = 16;
  const logoHmm = LOGO_W * (LOGO_SVG_VB_H / LOGO_SVG_VB_W);

  const year = new Date().getFullYear();
  const rightsLine = `© ${year} ${authorName} — All rights reserved.`;
  /** Legal body only; footer line drawn last */
  const legalSegments = [
    rightsLine,
    '',
    backCoverDescription,
    '',
    backCoverPropertyStatement,
    '',
    backCoverAiStatement,
  ];

  type FitCfg = { fs: number; lineMult: number; maxW: number };
  const tryConfigs: FitCfg[] = [
    { fs: 9, lineMult: 1.6, maxW: TEXT_W },
    { fs: 9, lineMult: 1.4, maxW: TEXT_W },
    { fs: 8, lineMult: 1.4, maxW: TEXT_W },
    { fs: 8, lineMult: 1.35, maxW: TEXT_W },
    { fs: 7.5, lineMult: 1.3, maxW: TEXT_W },
    { fs: 7.5, lineMult: 1.25, maxW: TEXT_W },
    { fs: 7, lineMult: 1.25, maxW: TEXT_W },
    { fs: 6.5, lineMult: 1.2, maxW: TEXT_W },
  ];

  const usableHeight = CARD_H - CARD_INNER_PADDING_TOP - CARD_INNER_PADDING_BOTTOM;
  const maxBlockHeight = usableHeight;

  function measureBlockHeight(cfg: FitCfg): number {
    applyFont(doc, 'normal');
    doc.setFontSize(cfg.fs);
    const lineH = ptToMm(cfg.fs * cfg.lineMult);
    let total = logoHmm + LOGO_TEXT_GAP;
    for (const p of legalSegments) {
      if (!p) {
        total += lineH;
      } else {
        const lines = doc.splitTextToSize(p, cfg.maxW) as string[];
        total += lines.length * lineH;
      }
    }
    total += FOOTER_GAP_BEFORE;
    const footerLines = doc.splitTextToSize(backCoverFooter, cfg.maxW) as string[];
    total += footerLines.length * lineH;
    return total;
  }

  let chosen: FitCfg | null = null;
  for (const cfg of tryConfigs) {
    if (measureBlockHeight(cfg) <= maxBlockHeight) {
      chosen = cfg;
      break;
    }
  }

  const cfg = chosen ?? tryConfigs[tryConfigs.length - 1]!;
  const lineH = ptToMm(cfg.fs * cfg.lineMult);
  const totalTextBlockHeight = measureBlockHeight(cfg);

  const blockStartY =
    CARD_Y + CARD_INNER_PADDING_TOP + (usableHeight - totalTextBlockHeight);

  applyFont(doc, 'normal');
  doc.setFontSize(cfg.fs);
  doc.setTextColor(0x12, 0x12, 0x12);

  let y = blockStartY;
  const logoCenterY = y + logoHmm / 2;
  await drawBiographyLibraryLogoMark(doc, textCenterX, logoCenterY, LOGO_W, '#000000');
  y += logoHmm + LOGO_TEXT_GAP;

  for (const p of legalSegments) {
    if (!p) {
      y += lineH;
      continue;
    }
    const lines = doc.splitTextToSize(p, TEXT_W) as string[];
    for (const line of lines) {
      doc.text(line, textCenterX, y, { align: 'center' });
      y += lineH;
    }
  }

  y += FOOTER_GAP_BEFORE;
  applyFont(doc, 'normal');
  doc.setFontSize(cfg.fs);
  const footerLines = doc.splitTextToSize(backCoverFooter, TEXT_W) as string[];
  for (const line of footerLines) {
    doc.text(line, textCenterX, y, { align: 'center' });
    y += lineH;
  }
}

export async function checkPdfPreflight(
  biographyId: string
): Promise<{ ready: boolean; reason: 'missing-cover' | 'ok' }> {
  const { data } = await supabase
    .from('biography_media')
    .select('id')
    .eq('biography_id', biographyId)
    .in('layout', ['cover', 'cover_a5'])
    .limit(1)
    .maybeSingle();
  if (!data) return { ready: false, reason: 'missing-cover' };
  return { ready: true, reason: 'ok' };
}

export async function checkBiographyPdfReadiness(
  biographyId: string,
  checkCoverReachability = false
): Promise<{ ok: boolean; issues: PdfReadinessIssue[] }> {
  const issues: PdfReadinessIssue[] = [];

  const { data: bio } = await supabase
    .from('biographies')
    .select('title, author_name, biography_mode, content, content_freeflow')
    .eq('id', biographyId)
    .maybeSingle();

  if (!bio) {
    return { ok: false, issues: ['missing-content'] };
  }

  if (!bio.title?.trim()) issues.push('missing-title');
  if (!bio.author_name?.trim()) issues.push('missing-author');
  if (!bio.biography_mode) issues.push('missing-mode');

  const mode = bio.biography_mode as 'sections' | 'freeflow' | undefined;
  const hasText =
    mode === 'freeflow'
      ? !!bio.content_freeflow?.trim()
      : mode === 'sections'
      ? Object.values((bio.content as Record<string, { text: string }>) ?? {}).some(
          (s) => stripHtml(s?.text ?? '').trim().length > 0
        )
      : false;

  if (!hasText) issues.push('missing-content');

  const { data: coverRow } = await supabase
    .from('biography_media')
    .select('id, file_url')
    .eq('biography_id', biographyId)
    .in('layout', ['cover', 'cover_a5'])
    .limit(1)
    .maybeSingle();

  if (!coverRow) {
    issues.push('missing-cover');
  } else if (checkCoverReachability && coverRow.file_url) {
    try {
      const signedUrl = await resolveSignedUrl(coverRow.file_url);
      const resp = await fetch(signedUrl, { method: 'HEAD' });
      if (!resp.ok) issues.push('cover-unreachable');
    } catch {
      issues.push('cover-unreachable');
    }
  }

  return { ok: issues.length === 0, issues };
}

export async function generateBiographyPDF(
  biography: BiographyData,
  _variant?: string,
  translations?: {
    createdWith: string;
    allRightsReserved: string;
    preface?: string;
    epilogue?: string;
    acknowledgements?: string;
    specificCredits?: string;
    backCoverDescription?: string;
    backCoverPropertyStatement?: string;
    backCoverAiStatement?: string;
    backCoverFooter?: string;
  },
  draftIteration?: number | null,
  contentLanguage?: string,
  previewOnly?: boolean,
  /** Server: return PDF bytes instead of triggering a browser download. */
  returnArrayBuffer?: boolean
): Promise<void | string | ArrayBuffer> {
  if (!biography.id) {
    throw new Error('MISSING_BIOGRAPHY_ID');
  }

  const [, bookStructure, coverComposite, coverA5, galleryPhotos] = await Promise.all([
    loadNotoSerifFonts(),
    biography.id ? fetchBookStructure(biography.id) : Promise.resolve(null),
    fetchCoverCompositeOptional(biography.id),
    fetchCoverA5Optional(biography.id),
    fetchGalleryPhotos(biography.id),
  ]);

  if (!coverA5 && !coverComposite) {
    throw new Error('MISSING_COVER_PHOTO');
  }

  const lang = contentLanguage ?? 'en';
  const watermarkLabel =
    draftIteration != null ? getDraftLabel(draftIteration, lang) : null;

  const centerX = B5_W / 2;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [B5_W, B5_H],
  });

  registerFonts(doc);

  const state: PdfState = {
    doc,
    absolutePage: 1,
    contentPageNum: 0,
    watermarkLabel,
  };

  const textAreaTop = MARGIN_TOP;
  const textAreaBottom = B5_H - MARGIN_BOTTOM;

  // ────────────────────────────────────────
  // PAGE 1 — COVER (custom A5 full bleed OR composite card + photo)
  // ────────────────────────────────────────
  if (coverA5) {
    logPdfBuildStep('page 1: full-bleed custom A5 cover (cover_a5)');
    drawFullBleedCustomCover(doc, coverA5.base64, coverA5.format);
  } else {
    logPdfBuildStep('page 1: composite cover (layout=cover)');
    const dims = await resolveCoverImagePixelDimensions(doc, coverComposite!.base64, coverComposite!.format);
    await drawPhotoCover(
      doc,
      biography.title,
      biography.author_name,
      coverComposite!.base64,
      coverComposite!.format,
      dims
    );
  }

  if (watermarkLabel) {
    drawDraftWatermark(doc, watermarkLabel);
  }

  // ────────────────────────────────────────
  // Optional short author credits (book structure flag only)
  // ────────────────────────────────────────
  if (bookStructure?.include_author_copyright_page) {
    logPdfBuildStep('optional: author copyright page');
    addNewPage(state, false);
    const createdWith = translations?.createdWith ?? 'Created with Biography Library';
    const allRightsRaw = translations?.allRightsReserved ?? '© {year} all rights reserved';
    const year = new Date().getFullYear();
    const allRights = allRightsRaw.replace('{year}', String(year));

    const creditsLines = [
      biography.author_name,
      formatBiographyDate(biography.created_at),
      createdWith,
      'biographylibrary.org',
      allRights,
    ];

    applyFont(doc, 'normal');
    doc.setFontSize(PT_CREDITS);
    doc.setTextColor(80, 80, 80);

    const creditsLineH = ptToMm(PT_CREDITS * 1.8);
    const creditsStartY = B5_H * 0.67;
    creditsLines.forEach((line, i) => {
      doc.text(line, centerX, creditsStartY + i * creditsLineH, { align: 'center' });
    });
  }

  // ────────────────────────────────────────
  // Inner title page (author + title)
  // ────────────────────────────────────────
  logPdfBuildStep('inner title page (author + title)');
  addNewPage(state, false);

  const coverSafeWidth = B5_W - 20;

  applyFont(doc, 'normal');
  doc.setFontSize(PT_TITLE_PAGE_AUTHOR);
  doc.setTextColor(80, 80, 80);
  doc.text(biography.author_name, centerX, 40, { align: 'center' });

  applyFont(doc, 'normal');
  doc.setFontSize(PT_TITLE_PAGE_TITLE);
  doc.setTextColor(0, 0, 0);
  const titlePageLines = doc.splitTextToSize(biography.title, coverSafeWidth);
  let titlePageY = B5_H / 2 - (titlePageLines.length * ptToMm(PT_TITLE_PAGE_TITLE * LINE_HEIGHT_BODY)) / 2;
  titlePageLines.forEach((line: string) => {
    doc.text(line, centerX, titlePageY, { align: 'center' });
    titlePageY += ptToMm(PT_TITLE_PAGE_TITLE * LINE_HEIGHT_BODY);
  });

  // ────────────────────────────────────────
  // FRONT MATTER — only when toggle on and content non-empty
  // ────────────────────────────────────────

  if (bookStructure && hasPdfFrontMatter(bookStructure)) {
    const bs = bookStructure;

    if (bs.dedication_enabled && hasContent(bs.dedication_content)) {
      logPdfBuildStep('front matter: dedication');
      addNewPage(state, false);
      addDedicationPage(state, bs.dedication_content!);
    }

    if (bs.epigraph_enabled && hasContent(bs.epigraph_content)) {
      logPdfBuildStep('front matter: epigraph');
      addNewPage(state, false);
      addEpigraphPage(state, bs.epigraph_content!, bs.epigraph_source);
    }

    if (bs.preface_enabled && hasContent(bs.preface_content)) {
      logPdfBuildStep('front matter: preface');
      addNewPage(state, false);
      addSectionWithTitle(
        state,
        translations?.preface ?? 'Preface',
        bs.preface_content!,
        PT_BODY,
        LINE_HEIGHT_BODY,
        true
      );
    }
  }

  // ────────────────────────────────────────
  // CHAPTERS
  // ────────────────────────────────────────

  const getSections = () => {
    const isFinalOrPublished =
      biography.status === 'final_version' ||
      biography.status === 'published' ||
      biography.status === 'pdf_draft' ||
      biography.status === 'locked_pending_screening' ||
      biography.status === 'under_review';
    if (isFinalOrPublished && biography.final_version) {
      const text = stripHtml(biography.final_version);
      if (text.trim()) {
        return [{ key: 'final_version', title: biography.title, text }];
      }
    }
    if (biography.biography_mode === 'freeflow') {
      const rawText = biography.content_freeflow || '';
      const text = stripHtml(rawText);
      if (!text.trim()) return [];
      return [{ key: 'freeflow', title: biography.title, text }];
    }
    const narrativeOrder = Array.isArray(biography.narrative_order) && biography.narrative_order.length > 0
      ? biography.narrative_order
      : null;
    const ordered = narrativeOrder
      ? [...BIOGRAPHY_SECTIONS].sort((a, b) => {
          const ai = narrativeOrder.indexOf(a.key);
          const bi = narrativeOrder.indexOf(b.key);
          const aIdx = ai === -1 ? narrativeOrder.length : ai;
          const bIdx = bi === -1 ? narrativeOrder.length : bi;
          return aIdx - bIdx;
        })
      : BIOGRAPHY_SECTIONS;
    return ordered
      .filter((s) => stripHtml(biography.content[s.key]?.text ?? '').trim())
      .map((s) => ({
        key: s.key,
        title: s.title,
        text: biography.content[s.key].text,
      }));
  };

  const sections = getSections();
  const lineH = bodyLineH();
  const isFreeflowContent = biography.biography_mode === 'freeflow';
  const continuationBodyTop = isFreeflowContent ? textAreaTop + FREEFLOW_EXTRA_TOP_MARGIN_MM : textAreaTop;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const cleanSectionText = stripHtml(section.text);

    logPdfBuildStep(`main body start: section "${section.key}" (${section.title})`);
    addNewPage(state, true);
    if (!isFreeflowContent && !isOddPage(state.absolutePage)) {
      addNewPage(state, true);
    }

    let y: number;

    if (!isFreeflowContent) {
      const headingWidth = textAvailableWidth(state.absolutePage);
      const headingLineH = ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY);
      const chapterTitleStartY = Math.max(textAreaTop + 10, SECTION_HEADING_TOP_MM);

      applyFont(doc, 'normal');
      doc.setFontSize(PT_CHAPTER);
      doc.setTextColor(0, 0, 0);

      let headingLines = doc.splitTextToSize(section.title, headingWidth) as string[];

      let headingBlockH =
        headingLines.length * headingLineH + CHAPTER_HEADING_BODY_GAP_MM;
      if (chapterTitleStartY + headingBlockH + 3 * lineH > textAreaBottom) {
        addNewPage(state, true);
        if (!isOddPage(state.absolutePage)) {
          addNewPage(state, true);
        }
        applyFont(doc, 'normal');
        doc.setFontSize(PT_CHAPTER);
        doc.setTextColor(0, 0, 0);
        headingLines = doc.splitTextToSize(section.title, textAvailableWidth(state.absolutePage)) as string[];
        headingBlockH =
          headingLines.length * headingLineH + CHAPTER_HEADING_BODY_GAP_MM;
      }

      headingLines.forEach((line, i) => {
        doc.text(line, textStartX(state.absolutePage), chapterTitleStartY + i * headingLineH);
      });
      y = chapterTitleStartY + headingLines.length * headingLineH + CHAPTER_HEADING_BODY_GAP_MM;

      if (PDF_DRAW_SECTION_RUNNING_HEADER) {
        drawRunningHeader(state, section.title);
      }
    } else {
      y = continuationBodyTop;
    }

    drawPageNumber(state);

    applyFont(doc, 'normal');
    doc.setFontSize(PT_BODY);
    doc.setTextColor(0, 0, 0);

    const paragraphs = cleanSectionText.split(/\n\n+/);

    for (const para of paragraphs) {
      if (!para.trim()) continue;

      const tw = textAvailableWidth(state.absolutePage);
      const lines = doc.splitTextToSize(para.trim(), tw);

      for (const line of lines) {
        if (y + lineH > textAreaBottom) {
          addNewPage(state, true);
          if (!isFreeflowContent && PDF_DRAW_SECTION_RUNNING_HEADER) {
            drawRunningHeader(state, section.title);
          }
          drawPageNumber(state);
          applyFont(doc, 'normal');
          doc.setFontSize(PT_BODY);
          doc.setTextColor(0, 0, 0);
          y = continuationBodyTop;
        }
        doc.text(line, textStartX(state.absolutePage), y);
        y += lineH;
      }
      y += lineH * 0.4;
    }

  }

  if (galleryPhotos.length > 0) {
    logPdfBuildStep(`gallery: ${galleryPhotos.length} media row(s)`);
    await renderGalleryPhotosForSection(state, galleryPhotos);
  }

  // ────────────────────────────────────────
  // BACK MATTER — Epilogue, Acknowledgements, Specific Credits
  // ────────────────────────────────────────

  if (bookStructure) {
    const bs = bookStructure;

    if (bs.epilogue_enabled && hasContent(bs.epilogue_content)) {
      logPdfBuildStep('back matter: epilogue');
      addNewPage(state, false);
      addSectionWithTitle(
        state,
        translations?.epilogue ?? 'Epilogue',
        bs.epilogue_content!,
        PT_BODY,
        LINE_HEIGHT_BODY,
        true
      );
    }

    if (bs.acknowledgements_enabled && hasContent(bs.acknowledgements_content)) {
      logPdfBuildStep('back matter: acknowledgements');
      addNewPage(state, false);
      addSectionWithTitle(
        state,
        translations?.acknowledgements ?? 'Acknowledgements',
        bs.acknowledgements_content!,
        PT_BODY,
        LINE_HEIGHT_BODY,
        true
      );
    }

    if (bs.specific_credits_enabled && hasContent(bs.specific_credits_content)) {
      logPdfBuildStep('back matter: specific credits');
      addNewPage(state, false);
      addSectionWithTitle(
        state,
        translations?.specificCredits ?? 'Credits',
        bs.specific_credits_content!,
        PT_CREDITS,
        1.5,
        false
      );
    }
  }

  // ────────────────────────────────────────
  // BACK COVER — single fresh page (no blank spreads)
  // ────────────────────────────────────────
  logPdfBuildStep('back cover legal page');
  addNewPage(state, false);

  await drawBackCover(
    doc,
    biography.author_name,
    translations?.backCoverDescription ??
      'This biography was managed with Biography Library, the digital archive of human memory that freely offers the tools to create and preserve your own story or that of a loved one.',
    translations?.backCoverPropertyStatement ??
      'The text of this biography is the exclusive property of the author, who retains all rights to pursue any unauthorized use, including use for AI training purposes.',
    translations?.backCoverAiStatement ??
      "Biography Library prohibits the use of content hosted on its servers for text mining, AI training or machine learning, pursuant to the Swiss Copyright Act (CopA/LDA) and the author's exclusive right of use under Swiss law.",
    translations?.backCoverFooter ?? 'Biography Library · biographylibrary.org'
  );

  if (returnArrayBuffer) {
    return doc.output('arraybuffer') as ArrayBuffer;
  }

  if (previewOnly) {
    return doc.output('bloburl') as unknown as string;
  }

  const safeName = biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateStamp = new Date().toISOString().split('T')[0];
  const draftSuffix = draftIteration != null ? `-draft${draftIteration}` : '';
  doc.save(`${safeName}${draftSuffix}-${dateStamp}.pdf`);
}

export type PdfVariant = 'b5-standard';
