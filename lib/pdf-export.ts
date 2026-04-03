import jsPDF from 'jspdf';
import type { SupabaseClient } from '@supabase/supabase-js';

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

const SAFE_MARGIN = 5;

const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;
const MARGIN_INNER = 20;
const MARGIN_OUTER = 15;

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

function drawLogoSvg(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  logoW: number,
  fillHex: string
) {
  const logoH = logoW * (LOGO_SVG_VB_H / LOGO_SVG_VB_W);
  const x = centerX - logoW / 2;
  const y = centerY - logoH / 2;

  const svgStr = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${logoW}mm" height="${logoH}mm"`,
    ` viewBox="0 0 ${LOGO_SVG_VB_W} ${LOGO_SVG_VB_H}">`,
    `<path fill="${fillHex}" d="${LOGO_SVG_PATH}"/>`,
    `</svg>`,
  ].join('');

  try {
    (doc as any).addSvgAsImage(svgStr, x, y, logoW, logoH);
  } catch {
    doc.setFillColor(128, 128, 128);
    doc.rect(x, y, logoW, logoH, 'F');
  }
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
  const chapterTitleY = textAreaTop + 10;

  applyFont(doc, 'normal');
  doc.setFontSize(PT_CHAPTER);
  doc.setTextColor(0, 0, 0);
  doc.text(sectionTitle, tx, chapterTitleY, { align: 'left' });

  state.contentPageNum++;

  if (drawRunningHeaderFn) {
    drawRunningHeader(state, sectionTitle);
  }
  drawPageNumber(state);

  const bodyStartY = chapterTitleY + ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY) + 4;

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
      .select(
        'dedication_content, dedication_enabled, epigraph_content, epigraph_source, epigraph_enabled, preface_content, preface_enabled, epilogue_content, epilogue_enabled, acknowledgements_content, acknowledgements_enabled, specific_credits_content, specific_credits_enabled'
      )
      .eq('biography_id', biographyId)
      .maybeSingle();

    if (error || !data) return null;
    return data as BookStructure;
  } catch {
    return null;
  }
}

function hasContent(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return stripHtml(value).trim().length > 0;
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

/** Signed URL for the cover image (web display), or null if none. */
export async function getCoverPhotoDisplayUrl(biographyId: string): Promise<string | null> {
  const { data } = await getPdfSupabase()
    .from('biography_media')
    .select('file_url')
    .eq('biography_id', biographyId)
    .eq('layout', 'cover')
    .limit(1)
    .maybeSingle();
  if (!data?.file_url) return null;
  try {
    return await resolveSignedUrl(data.file_url);
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

async function fetchCoverPhotoBase64(
  biographyId: string
): Promise<{ base64: string; format: string }> {
  const { data } = await getPdfSupabase()
    .from('biography_media')
    .select('file_url')
    .eq('biography_id', biographyId)
    .eq('layout', 'cover')
    .limit(1)
    .maybeSingle();

  if (!data?.file_url) {
    throw new Error('MISSING_COVER_PHOTO');
  }

  const url = await resolveSignedUrl(data.file_url);

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('MISSING_COVER_PHOTO');
    const contentType = resp.headers.get('content-type');
    const format = detectImageFormat(url, contentType);
    const buf = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    return { base64, format };
  } catch {
    throw new Error('MISSING_COVER_PHOTO');
  }
}

function drawPhotoCover(
  doc: jsPDF,
  title: string,
  authorName: string,
  coverBase64: string,
  coverFormat: string
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, B5_W, B5_H, 'F');

  const BORDER = 10;
  const CARD_W = 156;
  const RADIUS = 5;
  const PAD = 10;

  const PT_TITLE_COVER = 34;
  const PT_AUTHOR_COVER = 18;

  const titleLineH = ptToMm(PT_TITLE_COVER * 1.25);
  const authorLineH = ptToMm(PT_AUTHOR_COVER * 1.25);

  applyFont(doc, 'normal');
  doc.setFontSize(PT_TITLE_COVER);
  const textAreaW = CARD_W - PAD * 2;
  const rawTitleLines = doc.splitTextToSize(title, textAreaW);
  const titleLines = rawTitleLines.slice(0, 3) as string[];
  if (rawTitleLines.length > 3) {
    titleLines[2] = titleLines[2].replace(/\.{0,3}$/, '') + '\u2026';
  }

  const titleBlockH = titleLines.length * titleLineH;
  const AUTHOR_GAP = 7;
  const CARD_H = PAD + titleBlockH + AUTHOR_GAP + authorLineH + PAD;

  const CARD_X = BORDER;
  const CARD_Y = BORDER;

  doc.setFillColor(0xec, 0xe9, 0xe4);
  (doc as any).roundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, RADIUS, RADIUS, 'F');

  applyFont(doc, 'normal');
  doc.setFontSize(PT_TITLE_COVER);
  doc.setTextColor(0x12, 0x12, 0x12);

  const titleStartY = CARD_Y + PAD + ptToMm(PT_TITLE_COVER * 0.75);
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, CARD_X + PAD, titleStartY + i * titleLineH);
  });

  applyFont(doc, 'normal');
  doc.setFontSize(PT_AUTHOR_COVER);
  doc.setTextColor(0x12, 0x12, 0x12);

  const authorY = titleStartY + titleLines.length * titleLineH + AUTHOR_GAP;
  doc.text(authorName, CARD_X + PAD, authorY);

  const PHOTO_GAP = 5;
  const PHOTO_X = BORDER;
  const PHOTO_Y = CARD_Y + CARD_H + PHOTO_GAP;
  const PHOTO_W = 156;
  const PHOTO_H = 156;

  const docAny = doc as any;
  const hasClipping =
    typeof docAny.saveGraphicsState === 'function' &&
    typeof docAny.restoreGraphicsState === 'function' &&
    typeof docAny.clip === 'function';

  if (hasClipping) {
    docAny.saveGraphicsState();
    (doc as any).roundedRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H, RADIUS, RADIUS, null);
    docAny.clip();
    doc.addImage(coverBase64, coverFormat, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
    docAny.restoreGraphicsState();
  } else {
    doc.addImage(coverBase64, coverFormat, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);

    doc.setFillColor(255, 255, 255);
    doc.rect(PHOTO_X, PHOTO_Y, RADIUS, RADIUS, 'F');
    doc.rect(PHOTO_X + PHOTO_W - RADIUS, PHOTO_Y, RADIUS, RADIUS, 'F');
    doc.rect(PHOTO_X, PHOTO_Y + PHOTO_H - RADIUS, RADIUS, RADIUS, 'F');
    doc.rect(PHOTO_X + PHOTO_W - RADIUS, PHOTO_Y + PHOTO_H - RADIUS, RADIUS, RADIUS, 'F');
  }
}

function drawBackCover(
  doc: jsPDF,
  authorName: string,
  createdWith: string,
  allRightsReserved: string,
  createdAt: string
): void {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, B5_W, B5_H, 'F');

  const BORDER = 10;
  const CARD_W = 156;
  const CARD_H = 230;
  const CARD_X = BORDER;
  const CARD_Y = BORDER;
  const RADIUS = 5;

  doc.setFillColor(0xec, 0xe9, 0xe4);
  (doc as any).roundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, RADIUS, RADIUS, 'F');

  const centerX = CARD_X + CARD_W / 2;

  const LOGO_W = 16;
  const LOGO_H = LOGO_W * (LOGO_SVG_VB_H / LOGO_SVG_VB_W);
  const LOGO_GAP_ABOVE_TEXT = 5;

  const year = new Date().getFullYear();
  const allRights = allRightsReserved.replace('{year}', String(year));

  const legalLines = [
    authorName,
    formatBiographyDate(createdAt),
    createdWith,
    'biographylibrary.org',
    allRights,
  ];

  applyFont(doc, 'normal');
  doc.setFontSize(PT_CREDITS);
  doc.setTextColor(0, 0, 0);

  const creditsLineH = ptToMm(PT_CREDITS * LINE_HEIGHT_BODY);
  const textBlockH = legalLines.length * creditsLineH;

  const MAX_TEXT_W = 78;
  const textBlockBottom = CARD_Y + CARD_H - 12;
  const textBlockTop = textBlockBottom - textBlockH;

  legalLines.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(line, MAX_TEXT_W) as string[];
    wrapped.forEach((wl, wi) => {
      doc.text(wl, centerX, textBlockTop + (i + wi) * creditsLineH, { align: 'center' });
    });
  });

  const logoCenterY = textBlockTop - LOGO_GAP_ABOVE_TEXT - LOGO_H / 2;
  drawLogoSvg(doc, centerX, logoCenterY, LOGO_W, '#000000');
}

export async function checkPdfPreflight(
  biographyId: string
): Promise<{ ready: boolean; reason: 'missing-cover' | 'ok' }> {
  const { data } = await supabase
    .from('biography_media')
    .select('id')
    .eq('biography_id', biographyId)
    .eq('layout', 'cover')
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
    .eq('layout', 'cover')
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

  const [, bookStructure, coverPhoto, galleryPhotos] = await Promise.all([
    loadNotoSerifFonts(),
    biography.id ? fetchBookStructure(biography.id) : Promise.resolve(null),
    fetchCoverPhotoBase64(biography.id),
    fetchGalleryPhotos(biography.id),
  ]);

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
  // PAGE 1 — PHOTO COVER
  // ────────────────────────────────────────
  drawPhotoCover(
    doc,
    biography.title,
    biography.author_name,
    coverPhoto.base64,
    coverPhoto.format
  );

  if (watermarkLabel) {
    drawDraftWatermark(doc, watermarkLabel);
  }

  // ────────────────────────────────────────
  // PAGE 2 — BLANK
  // ────────────────────────────────────────
  addNewPage(state, false);

  // ────────────────────────────────────────
  // PAGE 3 — LOGO PAGE (black logo centered)
  // ────────────────────────────────────────
  addNewPage(state, false);
  const logoWBig = 40;
  drawLogoSvg(doc, centerX, B5_H / 2, logoWBig, '#000000');

  // ────────────────────────────────────────
  // PAGE 4 — CREDITS
  // ────────────────────────────────────────
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

  // ────────────────────────────────────────
  // PAGE 5 — TITLE PAGE (FRONTESPIZIO)
  // ────────────────────────────────────────
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
  const titlePageBlockH = titlePageLines.length * ptToMm(PT_TITLE_PAGE_TITLE * LINE_HEIGHT_BODY);
  let titlePageY = B5_H / 2 - titlePageBlockH / 2;
  titlePageLines.forEach((line: string) => {
    doc.text(line, centerX, titlePageY, { align: 'center' });
    titlePageY += ptToMm(PT_TITLE_PAGE_TITLE * LINE_HEIGHT_BODY);
  });

  // ────────────────────────────────────────
  // PAGE 6 — BLANK
  // ────────────────────────────────────────
  addNewPage(state, false);

  // ────────────────────────────────────────
  // FRONT MATTER — Dedication, Epigraph, Preface
  // ────────────────────────────────────────

  if (bookStructure) {
    const bs = bookStructure;

    if (bs.dedication_enabled && hasContent(bs.dedication_content)) {
      addNewPage(state, false);
      addDedicationPage(state, bs.dedication_content!);
    }

    if (bs.epigraph_enabled && hasContent(bs.epigraph_content)) {
      addNewPage(state, false);
      addEpigraphPage(state, bs.epigraph_content!, bs.epigraph_source);
    }

    if (bs.preface_enabled && hasContent(bs.preface_content)) {
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

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const cleanSectionText = stripHtml(section.text);

    addNewPage(state, true);
    if (!isOddPage(state.absolutePage)) {
      addNewPage(state, true);
    }

    applyFont(doc, 'normal');
    doc.setFontSize(PT_CHAPTER);
    doc.setTextColor(0, 0, 0);

    const tx = textStartX(state.absolutePage);
    const chapterTitleY = textAreaTop + 10;
    doc.text(section.title, tx, chapterTitleY, { align: 'left' });

    let y = chapterTitleY + ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY) + 4;

    if (y + 3 * lineH > textAreaBottom) {
      addNewPage(state, true);
      if (!isOddPage(state.absolutePage)) {
        addNewPage(state, true);
      }
      applyFont(doc, 'normal');
      doc.setFontSize(PT_CHAPTER);
      doc.setTextColor(0, 0, 0);
      doc.text(section.title, textStartX(state.absolutePage), chapterTitleY, { align: 'left' });
      y = chapterTitleY + ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY) + 4;
    }

    drawRunningHeader(state, section.title);
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
          drawRunningHeader(state, section.title);
          drawPageNumber(state);
          applyFont(doc, 'normal');
          doc.setFontSize(PT_BODY);
          doc.setTextColor(0, 0, 0);
          y = textAreaTop;
        }
        doc.text(line, textStartX(state.absolutePage), y);
        y += lineH;
      }
      y += lineH * 0.4;
    }

  }

  if (galleryPhotos.length > 0) {
    await renderGalleryPhotosForSection(state, galleryPhotos);
  }

  // ────────────────────────────────────────
  // BACK MATTER — Epilogue, Acknowledgements, Specific Credits
  // ────────────────────────────────────────

  if (bookStructure) {
    const bs = bookStructure;

    if (bs.epilogue_enabled && hasContent(bs.epilogue_content)) {
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
  // BACK COVER (must be even page)
  // ────────────────────────────────────────
  if (isOddPage(state.absolutePage)) {
    addNewPage(state, false);
    addNewPage(state, false);
  } else {
    addNewPage(state, false);
  }

  drawBackCover(
    doc,
    biography.author_name,
    createdWith,
    allRightsRaw,
    biography.created_at
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
