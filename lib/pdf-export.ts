import jsPDF from 'jspdf';
import { BIOGRAPHY_SECTIONS } from './editor-constants';
import { supabase } from './supabase';

interface BiographyData {
  id?: string;
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  created_at: string;
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

const BRAND_COLOR: [number, number, number] = [20, 184, 166];

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

async function loadNotoSerifFonts(): Promise<void> {
  if (fontsLoaded) return;

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
  const logoH = logoW / 0.83;
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
}

function addNewPage(state: PdfState, isContent: boolean): void {
  const { doc } = state;
  doc.addPage([B5_W, B5_H]);
  state.absolutePage++;
  if (isContent) {
    state.contentPageNum++;
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
  const paragraphs = text.split(/\n\n+/);

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

  const tw = textAvailableWidth(state.absolutePage);
  const lines = doc.splitTextToSize(content.trim(), tw);
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

  const tw = textAvailableWidth(state.absolutePage);
  const lines = doc.splitTextToSize(content.trim(), tw);
  const centerX = B5_W / 2;
  const startY = 70;
  const lineH = ptToMm(PT_BODY * LINE_HEIGHT_BODY);

  lines.forEach((line: string, i: number) => {
    doc.text(line, centerX, startY + i * lineH, { align: 'center' });
  });

  if (source && source.trim()) {
    const sourceY = startY + lines.length * lineH + lineH * 0.8;
    applyFont(doc, 'normal');
    doc.setFontSize(PT_BODY - 1);
    doc.setTextColor(100, 100, 100);
    doc.text(`— ${source.trim()}`, centerX, sourceY, { align: 'center' });
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
    const { data, error } = await supabase
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
  return typeof value === 'string' && value.trim().length > 0;
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

async function fetchCoverPhotoBase64(
  biographyId: string
): Promise<{ base64: string; format: string }> {
  const { data } = await supabase
    .from('biography_media')
    .select('file_url, storage_path')
    .eq('biography_id', biographyId)
    .eq('layout', 'cover')
    .limit(1)
    .maybeSingle();

  const url = data?.file_url ?? data?.storage_path ?? null;

  if (!url) {
    throw new Error('MISSING_COVER_PHOTO');
  }

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

  const BOX_X = 10;
  const BOX_Y = 10;
  const BOX_W = 156;
  const BOX_H = 70;
  const RADIUS = 8;
  const PAD = 10;

  doc.setFillColor(0xec, 0xe9, 0xe4);
  (doc as any).roundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, RADIUS, RADIUS, 'F');

  const PT_TITLE = 33;
  const PT_AUTHOR = 18;
  const titleLineH = PT_TITLE * 0.352778 * 1.05;
  const authorHeightMm = PT_AUTHOR * 0.352778;

  applyFont(doc, 'normal');
  doc.setFontSize(PT_TITLE);
  doc.setTextColor(0x12, 0x12, 0x12);

  const textAreaW = BOX_W - PAD * 2;
  const rawTitleLines = doc.splitTextToSize(title, textAreaW);
  const titleLines = rawTitleLines.slice(0, 3);
  if (rawTitleLines.length > 3) {
    titleLines[2] = titleLines[2].replace(/\.{0,3}$/, '') + '\u2026';
  }

  const titleStartY = BOX_Y + PAD + titleLineH * 0.8;
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, BOX_X + PAD, titleStartY + i * titleLineH);
  });

  applyFont(doc, 'normal');
  doc.setFontSize(PT_AUTHOR);
  doc.setTextColor(0x12, 0x12, 0x12);

  const authorBaselineY = BOX_Y + BOX_H - PAD - authorHeightMm + authorHeightMm * 0.8;
  doc.text(authorName, BOX_X + PAD, authorBaselineY);

  const PHOTO_X = 10;
  const PHOTO_Y = 84;
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
  }
): Promise<void> {
  if (!biography.id) {
    throw new Error('MISSING_COVER_PHOTO');
  }

  const [, bookStructure, coverPhoto] = await Promise.all([
    loadNotoSerifFonts(),
    biography.id ? fetchBookStructure(biography.id) : Promise.resolve(null),
    fetchCoverPhotoBase64(biography.id),
  ]);

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
    if (biography.biography_mode === 'freeflow') {
      const text = biography.content_freeflow || '';
      if (!text.trim()) return [];
      return [{ key: 'freeflow', title: biography.title, text }];
    }
    return BIOGRAPHY_SECTIONS
      .filter((s) => biography.content[s.key]?.text?.trim())
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

    const paragraphs = section.text.split(/\n\n+/);

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

  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(SAFE_MARGIN, SAFE_MARGIN, B5_W - SAFE_MARGIN * 2, B5_H - SAFE_MARGIN * 2, 'F');

  const safeName = biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateStamp = new Date().toISOString().split('T')[0];
  doc.save(`${safeName}-${dateStamp}.pdf`);
}

export type PdfVariant = 'b5-standard';
