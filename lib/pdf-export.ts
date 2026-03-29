import jsPDF from 'jspdf';
import { BIOGRAPHY_SECTIONS } from './editor-constants';

interface BiographyData {
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  created_at: string;
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
const PT_COVER_TITLE = 28;
const PT_COVER_AUTHOR = 14;
const PT_TITLE_PAGE_TITLE = 28;
const PT_TITLE_PAGE_AUTHOR = 11;

const LINE_HEIGHT_BODY = 1.6;

const LOGO_SVG_PATH =
  'M173.05,321.36c6.48,4.65 12.13,9.91 16.82,15.70c25.72,-15.43 47.63,-35.95 64.62,-59.97c9.84,-13.95 18.06,-29.07 24.37,-45.04l3.94,-10.87c5.76,-17.31 9.39,-35.51 10.56,-54.26l0.12,-7.75l-96.15,-0.05c-1.83,3.74 -4.03,7.38 -6.59,10.88c-8.53,11.66 -20.82,21.46 -35.54,28.34c-1.14,0.54 -2.26,1.10 -3.36,1.67c-0.15,0.06 -0.29,0.14 -0.43,0.22c-23.46,12.32 -37.78,33.04 -37.66,54.91c0.06,10.83 3.71,21.62 10.54,31.22c5.42,7.60 12.75,14.33 21.46,19.73c-3.78,1.91 -7.41,4.01 -10.85,6.27c-7.29,-5.17 -13.52,-11.14 -18.54,-17.80c-8.93,-11.82 -13.68,-25.44 -13.76,-39.36c-0.07,-13.93 4.53,-27.59 13.31,-39.51c8.38,-11.37 20.35,-20.90 34.61,-27.56c9.71,-4.54 18.05,-10.41 24.68,-17.18c3.63,-3.70 6.75,-7.67 9.32,-11.84l-63.13,-0.03c5.50,8.87 13.56,16.82 23.75,23.19c-3.80,1.87 -7.45,3.95 -10.90,6.20c-7.35,-5.27 -13.62,-11.32 -18.65,-18.05c-2.72,-3.64 -5.05,-7.43 -6.98,-11.35l-94.79,-0.05l0.12,7.89c1.17,18.75 4.80,36.95 10.56,54.26l4.90,13.71h0.19c6.15,14.93 13.97,29.08 23.23,42.20c17.17,24.28 39.37,44.99 65.46,60.47c8.43,-10.67 20.06,-19.64 33.81,-26.07c1.19,-0.55 2.35,-1.14 3.49,-1.73c0.08,-0.04 0.15,-0.07 0.22,-0.11c23.50,-12.31 37.86,-33.05 37.74,-54.95c-0.06,-10.13 -3.25,-20.22 -9.25,-29.34c-0.01,-0.01 -0.02,-0.03 -0.03,-0.05c-0.41,-0.61 -0.83,-1.22 -1.25,-1.83c-5.41,-7.60 -12.75,-14.32 -21.46,-19.72c3.78,-1.91 7.41,-4.01 10.87,-6.29c7.29,5.17 13.52,11.14 18.54,17.79c8.92,11.83 13.68,25.44 13.76,39.36c0.07,13.92 -4.53,27.59 -13.32,39.51c-8.37,11.37 -20.34,20.91 -34.61,27.57c-1.51,0.70 -2.98,1.45 -4.42,2.21c-0.05,0.02 -0.10,0.05 -0.15,0.08c-9.66,5.16 -17.77,11.71 -23.96,19.14c6.71,3.51 13.65,6.69 20.81,9.51l4.59,1.43l4.59,-1.43c7.48,-2.94 14.72,-6.28 21.71,-9.98c-4.84,-5.63 -10.82,-10.73 -17.79,-15.10c3.80,-1.88 7.44,-3.95 10.90,-6.20zM293.77,140.32v-35.28c-49.86,-2.05 -89.98,-42.58 -91.35,-92.61h-43.52c1.40,73.97 60.94,133.98 134.74,136.12zM293.77,85.44v-10.65v-23.68c-20.16,-1.92 -36.17,-18.33 -37.47,-38.67h-43.57c1.37,44.35 36.86,80.26 81.04,82.29zM293.77,12.43h-27.15c1.25,14.66 12.67,26.46 27.15,28.30zM158.72,148.88l85.17,0c-38.93,-15.11 -69.98,-46.12 -85.17,-85.01zM148.57,12.43h-135.05v62.35h0.03v10.65h-0.03v54.89l0.13,8.55l134.92,0zM152.79,365.60c-0.11,-0.03 -0.23,-0.07 -0.35,-0.10c-44.84,-15.94 -82.27,-45.08 -108.49,-82.16c-11.86,-16.76 -21.42,-35.13 -28.35,-54.64l-0.17,-0.55c-8.33,-23.55 -12.79,-48.74 -12.79,-74.73V7.02c0,-2.98 2.43,-5.42 5.42,-5.42h291.16c2.98,0 5.42,2.43 5.42,5.42v146.40c0,25.98 -4.46,51.18 -12.79,74.73l-0.17,0.55c-6.92,19.50 -16.49,37.88 -28.35,54.64c-26.22,37.09 -63.65,66.22 -108.49,82.16c-0.24,0.07 -0.95,0.27 -1.20,0.27c-0.40,0 -0.85,-0.17 -0.85,-0.17zM81.01,133.29c-29.06,0 -52.61,-23.55 -52.61,-52.61c0,-29.06 23.55,-52.61 52.61,-52.61c29.06,0 52.61,23.55 52.61,52.61c0,29.06 -23.55,52.61 -52.61,52.61zM123.20,80.68c0,-23.30 -18.89,-42.20 -42.20,-42.20c-23.30,0 -42.20,18.89 -42.20,42.20c0,23.30 18.89,42.20 42.20,42.20c23.30,0 42.20,-18.89 42.20,-42.20z';

const LOGO_SVG_VB_W = 306.49;
const LOGO_SVG_VB_H = 368.28;

let notoSerifRegularBase64: string | null = null;
let notoSerifItalicBase64: string | null = null;
let fontsLoaded = false;

async function loadNotoSerifFonts(): Promise<void> {
  if (fontsLoaded) return;

  const regularUrl =
    'https://fonts.gstatic.com/s/notoserif/v24/ga6Iaw1J5X9T9RW6j9bNfFcWaDq8fMVxMw.woff2';
  const italicUrl =
    'https://fonts.gstatic.com/s/notoserif/v24/ga6Kaw1J5X9T9RW6j9bNfFImbjC7TMXZnKqT.woff2';

  try {
    const [regularResp, italicResp] = await Promise.all([
      fetch(regularUrl),
      fetch(italicUrl),
    ]);

    if (!regularResp.ok || !italicResp.ok) return;

    const [regularBuf, italicBuf] = await Promise.all([
      regularResp.arrayBuffer(),
      italicResp.arrayBuffer(),
    ]);

    notoSerifRegularBase64 = arrayBufferToBase64(regularBuf);
    notoSerifItalicBase64 = arrayBufferToBase64(italicBuf);
    fontsLoaded = true;
  } catch {
    fontsLoaded = false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function registerFonts(doc: jsPDF): boolean {
  if (!notoSerifRegularBase64 || !notoSerifItalicBase64) return false;
  try {
    doc.addFileToVFS('NotoSerif-Regular.woff2', notoSerifRegularBase64);
    doc.addFont('NotoSerif-Regular.woff2', 'NotoSerif', 'normal');
    doc.addFileToVFS('NotoSerif-Italic.woff2', notoSerifItalicBase64);
    doc.addFont('NotoSerif-Italic.woff2', 'NotoSerif', 'italic');
    return true;
  } catch {
    return false;
  }
}

function applyFont(doc: jsPDF, fontsAvailable: boolean, style: 'normal' | 'italic' = 'normal') {
  if (fontsAvailable) {
    doc.setFont('NotoSerif', style);
  } else {
    doc.setFont('times', style);
  }
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
  fontsAvailable: boolean;
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
  const { doc, absolutePage, fontsAvailable } = state;
  applyFont(doc, fontsAvailable, 'normal');
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
  const { doc, contentPageNum, fontsAvailable } = state;
  applyFont(doc, fontsAvailable, 'normal');
  doc.setFontSize(PT_PAGE_NUM);
  doc.setTextColor(80, 80, 80);
  const numY = B5_H - 10;
  const centerX = B5_W / 2;
  doc.text(String(contentPageNum), centerX, numY, { align: 'center' });
}

export async function generateBiographyPDF(
  biography: BiographyData,
  _variant?: string,
  translations?: {
    createdWith: string;
    allRightsReserved: string;
  }
): Promise<void> {
  await loadNotoSerifFonts();

  const centerX = B5_W / 2;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [B5_W, B5_H],
  });

  const fontsAvailable = registerFonts(doc);

  const state: PdfState = {
    doc,
    absolutePage: 1,
    contentPageNum: 0,
    fontsAvailable,
  };

  const textAreaTop = MARGIN_TOP;
  const textAreaBottom = B5_H - MARGIN_BOTTOM;

  // ────────────────────────────────────────
  // PAGE 1 — COVER
  // Brand color rectangle with 5mm safe margin on all sides
  // ────────────────────────────────────────
  doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
  doc.rect(SAFE_MARGIN, SAFE_MARGIN, B5_W - SAFE_MARGIN * 2, B5_H - SAFE_MARGIN * 2, 'F');

  const coverSafeWidth = B5_W - 20;
  applyFont(doc, fontsAvailable, 'normal');
  doc.setFontSize(PT_COVER_TITLE);
  doc.setTextColor(255, 255, 255);

  const coverTitleLines = doc.splitTextToSize(biography.title, coverSafeWidth);
  let coverY = B5_H * 0.6;
  coverTitleLines.forEach((line: string) => {
    doc.text(line, centerX, coverY, { align: 'center' });
    coverY += ptToMm(PT_COVER_TITLE * LINE_HEIGHT_BODY);
  });

  applyFont(doc, fontsAvailable, 'normal');
  doc.setFontSize(PT_COVER_AUTHOR);
  doc.setTextColor(255, 255, 255);
  const coverAuthorY = coverY + ptToMm(PT_COVER_AUTHOR);
  doc.text(biography.author_name, centerX, coverAuthorY, { align: 'center' });

  const logoWCover = 20;
  const logoHCover = logoWCover / 0.83;
  const logoYCover = 228;
  drawLogoSvg(doc, centerX, logoYCover + logoHCover / 2, logoWCover, '#FFFFFF');

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

  applyFont(doc, fontsAvailable, 'normal');
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

  applyFont(doc, fontsAvailable, 'normal');
  doc.setFontSize(PT_TITLE_PAGE_AUTHOR);
  doc.setTextColor(80, 80, 80);
  doc.text(biography.author_name, centerX, 40, { align: 'center' });

  applyFont(doc, fontsAvailable, 'normal');
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
  // PAGES 7+ — BIOGRAPHY CHAPTERS
  // Page 6 is even; next page (7) will be odd — correct.
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

    applyFont(doc, fontsAvailable, 'normal');
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
      applyFont(doc, fontsAvailable, 'normal');
      doc.setFontSize(PT_CHAPTER);
      doc.setTextColor(0, 0, 0);
      doc.text(section.title, textStartX(state.absolutePage), chapterTitleY, { align: 'left' });
      y = chapterTitleY + ptToMm(PT_CHAPTER * LINE_HEIGHT_BODY) + 4;
    }

    drawRunningHeader(state, section.title);
    drawPageNumber(state);

    applyFont(doc, fontsAvailable, 'normal');
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
          applyFont(doc, fontsAvailable, 'normal');
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
  // BACK COVER (must be even page)
  // Brand color rectangle with 5mm safe margin on all sides
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
