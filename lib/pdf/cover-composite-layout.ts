/** B5 composite cover layout (card titolo + foto). */

export const COVER_PAGE_W = 176;
export const COVER_PAGE_H = 250;
export const COVER_BORDER = 10;
export const COVER_GAP = 8;
export const COVER_RADIUS = 6;
export const COVER_INNER_PAD = 10;
/** Foto occupa ~62% dell'area utile (mockup BL_Cover_demo). */
export const COVER_PHOTO_RATIO = 0.62;
export const COVER_MIN_PHOTO_H = 90;
export const COVER_PT_TITLE = 34;
export const COVER_PT_AUTHOR = 18;
export const COVER_AUTHOR_GAP = 7;

export interface CoverRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoverCompositeLayout {
  cardW: number;
  titleCard: CoverRect;
  photoCard: CoverRect;
  textX: number;
  titleFirstBaselineY: number;
  lineHeightTitle: number;
  lineHeightAuthor: number;
  authorGap: number;
  cornerRadius: number;
}

function ptToMm(pt: number): number {
  return pt / 2.8346456693;
}

export function coverLineHeightTitle(): number {
  return (COVER_PT_TITLE * 1.2) / 2.83465;
}

export function coverLineHeightAuthor(): number {
  return (COVER_PT_AUTHOR * 1.2) / 2.83465;
}

export function measureTextBlockHeight(titleLineCount: number, authorLineCount: number): number {
  return (
    titleLineCount * coverLineHeightTitle() +
    COVER_AUTHOR_GAP +
    authorLineCount * coverLineHeightAuthor()
  );
}

export function computeCoverCompositeLayout(
  titleLineCount: number,
  authorLineCount: number
): CoverCompositeLayout {
  const cardW = COVER_PAGE_W - 2 * COVER_BORDER;
  const contentH = COVER_PAGE_H - 2 * COVER_BORDER;

  let photoH = contentH * COVER_PHOTO_RATIO;
  let titleH = contentH - photoH - COVER_GAP;

  const minTitleH = measureTextBlockHeight(titleLineCount, authorLineCount) + 2 * COVER_INNER_PAD;
  if (titleH < minTitleH) {
    titleH = minTitleH;
    photoH = contentH - titleH - COVER_GAP;
  }
  if (photoH < COVER_MIN_PHOTO_H) {
    photoH = COVER_MIN_PHOTO_H;
    titleH = Math.max(minTitleH, contentH - photoH - COVER_GAP);
  }

  const titleCard: CoverRect = {
    x: COVER_BORDER,
    y: COVER_BORDER,
    w: cardW,
    h: titleH,
  };

  const photoCard: CoverRect = {
    x: COVER_BORDER,
    y: COVER_BORDER + titleH + COVER_GAP,
    w: cardW,
    h: photoH,
  };

  const titleAscender = ptToMm(COVER_PT_TITLE) * 0.75;

  return {
    cardW,
    titleCard,
    photoCard,
    textX: COVER_BORDER + COVER_INNER_PAD,
    titleFirstBaselineY: titleCard.y + COVER_INNER_PAD + titleAscender,
    lineHeightTitle: coverLineHeightTitle(),
    lineHeightAuthor: coverLineHeightAuthor(),
    authorGap: COVER_AUTHOR_GAP,
    cornerRadius: COVER_RADIUS,
  };
}

type SplitDoc = {
  splitTextToSize: (text: string, maxWidth: number) => string | string[];
  setFontSize: (size: number) => void;
};

/** Split title/author to lines using jsPDF metrics. */
export function splitTitleAuthorLines(
  doc: SplitDoc,
  title: string,
  authorName: string,
  innerWidth: number
): { titleLines: string[]; authorLines: string[] } {
  doc.setFontSize(COVER_PT_TITLE);
  const titleLines = doc.splitTextToSize(title, innerWidth) as string[];
  doc.setFontSize(COVER_PT_AUTHOR);
  const authorLines = doc.splitTextToSize(authorName, innerWidth) as string[];
  return { titleLines, authorLines };
}
