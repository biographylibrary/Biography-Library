/** Typography pagination helpers for PDF layout (mm-based y positions). */

export const MIN_LINES_ORPHAN = 2;
export const MIN_LINES_WIDOW = 2;
export const MIN_LINES_BEFORE_BLOCK = 3;
export const MIN_TABLE_ROWS_ON_PAGE = 2;
export const MIN_LINES_AFTER_HEADING = 2;

export interface ParagraphBreakPlan {
  action: 'draw' | 'pageBreak';
  linesToDraw: number;
}

export function planParagraphBreak(
  currentY: number,
  lineH: number,
  textAreaBottom: number,
  totalLines: number,
  linesDrawn: number
): ParagraphBreakPlan {
  const remaining = totalLines - linesDrawn;
  const spaceLeft = textAreaBottom - currentY;
  const linesFit = Math.floor(spaceLeft / lineH);

  if (linesDrawn === 0) {
    if (totalLines <= MIN_LINES_ORPHAN) {
      if (totalLines * lineH > spaceLeft) {
        return { action: 'pageBreak', linesToDraw: 0 };
      }
      return { action: 'draw', linesToDraw: totalLines };
    }
    if (linesFit < MIN_LINES_ORPHAN) {
      return { action: 'pageBreak', linesToDraw: 0 };
    }
  }

  if (linesFit <= 0) {
    return { action: 'pageBreak', linesToDraw: 0 };
  }

  const willDraw = Math.min(linesFit, remaining);

  if (willDraw < remaining && remaining - willDraw < MIN_LINES_WIDOW) {
    if (linesDrawn === 0) {
      return { action: 'pageBreak', linesToDraw: 0 };
    }
    return { action: 'pageBreak', linesToDraw: 0 };
  }

  return { action: 'draw', linesToDraw: willDraw };
}

export function planAtomicBlockBreak(
  currentY: number,
  textAreaBottom: number,
  blockHeight: number
): 'draw' | 'pageBreak' {
  const spaceLeft = textAreaBottom - currentY;
  if (blockHeight <= spaceLeft) return 'draw';
  return 'pageBreak';
}

export function planTextBeforeBlockBreak(
  currentY: number,
  lineH: number,
  textAreaBottom: number,
  blockHeight: number
): 'draw' | 'pageBreak' {
  const spaceLeft = textAreaBottom - currentY;
  const linesLeft = Math.floor(spaceLeft / lineH);
  if (blockHeight > spaceLeft && linesLeft < MIN_LINES_BEFORE_BLOCK) {
    return 'pageBreak';
  }
  return 'draw';
}

export function planHeadingBreak(
  currentY: number,
  headingHeight: number,
  followingLineH: number,
  textAreaBottom: number,
  minFollowingLines: number = MIN_LINES_AFTER_HEADING
): 'draw' | 'pageBreak' {
  const needed = headingHeight + minFollowingLines * followingLineH;
  if (currentY + needed > textAreaBottom) {
    return 'pageBreak';
  }
  return 'draw';
}

export function measureCaptionHeight(
  captionLines: number,
  lineH: number,
  gapMm: number = 3
): number {
  if (captionLines <= 0) return 0;
  return captionLines * lineH + gapMm;
}

export type PhotoLayoutKind =
  | 'full-page'
  | 'two-vertical'
  | 'two-horizontal'
  | 'three-mixed';

export function measurePhotoLayoutHeight(
  layout: PhotoLayoutKind,
  pageContentHeight: number,
  captionLineH: number,
  captionLinesA: number,
  captionLinesB: number = 0,
  captionLinesC: number = 0
): number {
  const capA = measureCaptionHeight(captionLinesA, captionLineH);
  const capB = measureCaptionHeight(captionLinesB, captionLineH);
  const GAP = 4;

  switch (layout) {
    case 'full-page':
      return pageContentHeight;
    case 'two-vertical':
    case 'two-horizontal': {
      const capA = measureCaptionHeight(captionLinesA, captionLineH);
      const capB = measureCaptionHeight(captionLinesB, captionLineH);
      const photoH = (pageContentHeight - capA - capB - GAP) / 2;
      return photoH + capA + GAP + photoH + capB;
    }
    case 'three-mixed':
      return pageContentHeight;
    default:
      return pageContentHeight;
  }
}

export interface TableRowPlan {
  action: 'draw' | 'pageBreak';
  rowsToDraw: number;
}

export function planTableRowsBreak(
  currentY: number,
  rowHeight: number,
  textAreaBottom: number,
  totalRows: number,
  rowsDrawn: number,
  hasHeader: boolean,
  isFirstPage: boolean
): TableRowPlan {
  const remaining = totalRows - rowsDrawn;
  const spaceLeft = textAreaBottom - currentY;
  const rowsFit = Math.floor(spaceLeft / rowHeight);

  if (rowsDrawn === 0) {
    const minRows = hasHeader && isFirstPage ? 2 : MIN_TABLE_ROWS_ON_PAGE;
    if (remaining <= minRows) {
      if (remaining * rowHeight > spaceLeft) {
        return { action: 'pageBreak', rowsToDraw: 0 };
      }
      return { action: 'draw', rowsToDraw: remaining };
    }
    if (rowsFit < minRows) {
      return { action: 'pageBreak', rowsToDraw: 0 };
    }
  }

  if (rowsFit <= 0) {
    return { action: 'pageBreak', rowsToDraw: 0 };
  }

  const willDraw = Math.min(rowsFit, remaining);
  if (willDraw < remaining && remaining - willDraw < MIN_TABLE_ROWS_ON_PAGE) {
    if (rowsDrawn === 0) {
      return { action: 'pageBreak', rowsToDraw: 0 };
    }
    return { action: 'pageBreak', rowsToDraw: 0 };
  }

  return { action: 'draw', rowsToDraw: willDraw };
}
