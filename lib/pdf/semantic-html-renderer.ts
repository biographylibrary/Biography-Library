import type { jsPDF } from 'jspdf';
import {
  extractSemanticBlocks,
  parseHtmlIntoRuns,
  stripHtmlToPlain,
  type InlineRun,
  type SemanticBlock,
} from '@/lib/import/html-blocks';
import {
  planHeadingBreak,
  planParagraphBreak,
  MIN_LINES_AFTER_HEADING,
} from '@/lib/pdf/block-pagination';
import { splitTextToSizeLang, wrapTextToLines, type WrappedLine } from '@/lib/pdf/text-wrap';

const HEADING_GAP_BEFORE_MM = 5;
const PARAGRAPH_GAP_AFTER_MM = 2;
export const PT_BODY = 11;
export const PT_H1 = 22;
export const PT_H2 = 17;
export const PT_H3 = 14;
export const LINE_HEIGHT_BODY = 1.35;

export function ptToMm(pt: number): number {
  return pt * 0.352778;
}

export interface SemanticRenderContext {
  doc: jsPDF;
  y: number;
  textAreaTop: number;
  textAreaBottom: number;
  textStartX: (page: number) => number;
  textAvailableWidth: (page: number) => number;
  absolutePage: number;
  applyFont: (doc: jsPDF, style: 'normal' | 'bold' | 'italic' | 'bolditalic') => void;
  addNewPage: () => void;
  drawPageNumber?: () => void;
  drawRunningHeader?: (title: string) => void;
  sectionTitle?: string;
  language: string;
}

function fontSizeForTag(tag: string): number {
  if (tag === 'h1') return PT_H1;
  if (tag === 'h2') return PT_H2;
  if (tag === 'h3') return PT_H3;
  return PT_BODY;
}

function lineHForFont(fontSize: number): number {
  return ptToMm(fontSize * LINE_HEIGHT_BODY);
}

function fontStyleForRun(run: InlineRun): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  if (run.bold && run.italic) return 'bolditalic';
  if (run.bold) return 'bold';
  if (run.italic) return 'italic';
  return 'normal';
}

function drawRunsLine(
  ctx: SemanticRenderContext,
  runs: InlineRun[],
  x: number,
  y: number,
  fontSize: number
): void {
  let cursorX = x;
  for (const run of runs) {
    if (!run.text) continue;
    ctx.applyFont(ctx.doc, fontStyleForRun(run));
    ctx.doc.setFontSize(fontSize);
    ctx.doc.text(run.text, cursorX, y);
    cursorX += ctx.doc.getTextWidth(run.text);
  }
}

function sliceRunsForPlainSegment(runs: InlineRun[], start: number, end: number): InlineRun[] {
  const result: InlineRun[] = [];
  let pos = 0;
  for (const run of runs) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    if (runEnd <= start || runStart >= end) continue;
    const sliceStart = Math.max(0, start - runStart);
    const sliceEnd = Math.min(run.text.length, end - runStart);
    result.push({ ...run, text: run.text.slice(sliceStart, sliceEnd) });
  }
  return result;
}

function runsPlainText(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join('');
}

function drawStyledLine(
  ctx: SemanticRenderContext,
  runs: InlineRun[],
  line: WrappedLine,
  x: number,
  y: number,
  fontSize: number
): void {
  const lineRuns = sliceRunsForPlainSegment(runs, line.sourceStart, line.sourceEnd);
  if (lineRuns.length === 0) {
    ctx.applyFont(ctx.doc, 'normal');
    ctx.doc.setFontSize(fontSize);
    ctx.doc.text(line.display, x, y);
    return;
  }
  drawRunsLine(ctx, lineRuns, x, y, fontSize);
  if (line.display.endsWith('-')) {
    const drawn = lineRuns.map((r) => r.text).join('');
    if (!drawn.endsWith('-')) {
      let width = x;
      for (const run of lineRuns) {
        if (!run.text) continue;
        ctx.applyFont(ctx.doc, fontStyleForRun(run));
        ctx.doc.setFontSize(fontSize);
        width += ctx.doc.getTextWidth(run.text);
      }
      ctx.applyFont(ctx.doc, 'normal');
      ctx.doc.setFontSize(fontSize);
      ctx.doc.text('-', width, y);
    }
  }
}

function renderParagraphLines(
  ctx: SemanticRenderContext,
  innerHtml: string,
  fontSize: number,
  options?: { trailingGap?: boolean }
): number {
  const lineH = lineHForFont(fontSize);
  const plain = stripHtmlToPlain(innerHtml);
  if (!plain.trim()) return ctx.y;

  ctx.applyFont(ctx.doc, 'normal');
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(0, 0, 0);

  const tw = ctx.textAvailableWidth(ctx.absolutePage);
  const runs = parseHtmlIntoRuns(innerHtml);
  const runsPlain = runsPlainText(runs);
  const splitSource = runsPlain.trim() === plain.trim() ? runsPlain : plain.trim();
  const wrapped = wrapTextToLines(ctx.doc, splitSource, tw, ctx.language);
  const hasInlineStyles = runs.some((r) => r.bold || r.italic);
  let linesDrawn = 0;

  while (linesDrawn < wrapped.length) {
    const plan = planParagraphBreak(
      ctx.y,
      lineH,
      ctx.textAreaBottom,
      wrapped.length,
      linesDrawn
    );

    if (plan.action === 'pageBreak') {
      ctx.addNewPage();
      if (ctx.drawRunningHeader && ctx.sectionTitle) {
        ctx.drawRunningHeader(ctx.sectionTitle);
      }
      ctx.drawPageNumber?.();
      ctx.y = ctx.textAreaTop;
      ctx.applyFont(ctx.doc, 'normal');
      ctx.doc.setFontSize(fontSize);
      continue;
    }

    for (let i = 0; i < plan.linesToDraw; i++) {
      const line = wrapped[linesDrawn + i];
      const x = ctx.textStartX(ctx.absolutePage);

      if (!hasInlineStyles) {
        ctx.applyFont(ctx.doc, 'normal');
        ctx.doc.setFontSize(fontSize);
        ctx.doc.text(line.display, x, ctx.y);
      } else {
        drawStyledLine(ctx, runs, line, x, ctx.y, fontSize);
      }
      ctx.y += lineH;
    }
    linesDrawn += plan.linesToDraw;
  }

  if (options?.trailingGap !== false) {
    ctx.y += PARAGRAPH_GAP_AFTER_MM;
  }
  return ctx.y;
}

function renderHeading(
  ctx: SemanticRenderContext,
  innerHtml: string,
  tag: string
): number {
  const fontSize = fontSizeForTag(tag);
  const lineH = lineHForFont(fontSize);
  const tw = ctx.textAvailableWidth(ctx.absolutePage);
  const plain = stripHtmlToPlain(innerHtml);
  if (!plain.trim()) return ctx.y;

  const headingLines = splitTextToSizeLang(ctx.doc, plain.trim(), tw, ctx.language);
  const headingHeight = headingLines.length * lineH;
  const bodyLineH = lineHForFont(PT_BODY);

  if (
    planHeadingBreak(ctx.y, headingHeight, bodyLineH, ctx.textAreaBottom, MIN_LINES_AFTER_HEADING) ===
    'pageBreak'
  ) {
    ctx.addNewPage();
    if (ctx.drawRunningHeader && ctx.sectionTitle) {
      ctx.drawRunningHeader(ctx.sectionTitle);
    }
    ctx.drawPageNumber?.();
    ctx.y = ctx.textAreaTop;
  }

  ctx.applyFont(ctx.doc, 'normal');
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(0, 0, 0);

  for (const line of headingLines) {
    ctx.doc.text(line, ctx.textStartX(ctx.absolutePage), ctx.y);
    ctx.y += lineH;
  }
  return ctx.y;
}

function parseTableRows(tableHtml: string): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];
  const thRe = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let hm: RegExpExecArray | null;
  const headerRow = tableHtml.match(/<thead\b[\s\S]*?<\/thead>/i);
  if (headerRow) {
    while ((hm = thRe.exec(headerRow[0])) !== null) {
      headers.push(stripHtmlToPlain(hm[1]));
    }
  }
  let tm: RegExpExecArray | null;
  const body = tableHtml.match(/<tbody\b[\s\S]*?<\/tbody>/i)?.[0] ?? tableHtml;
  while ((tm = trRe.exec(body)) !== null) {
    const cells: string[] = [];
    const tdRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = tdRe.exec(tm[1])) !== null) {
      cells.push(stripHtmlToPlain(cm[1]));
    }
    if (cells.length) rows.push(cells);
  }
  return { headers, rows };
}

function renderTable(ctx: SemanticRenderContext, tableHtml: string): number {
  const { headers, rows } = parseTableRows(tableHtml);
  const fontSize = PT_BODY - 1;
  const lineH = lineHForFont(fontSize);
  const rowH = lineH + ptToMm(2);
  const tw = ctx.textAvailableWidth(ctx.absolutePage);
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const colW = tw / colCount;

  const allRows = headers.length ? [headers, ...rows] : rows;
  let rowsDrawn = 0;
  let isFirst = true;

  while (rowsDrawn < allRows.length) {
    const remaining = allRows.length - rowsDrawn;
    const spaceLeft = ctx.textAreaBottom - ctx.y;
    const rowsFit = Math.floor(spaceLeft / rowH);
    const minNeed = rowsDrawn === 0 ? Math.min(2, remaining) : 1;

    if (rowsFit < minNeed) {
      ctx.addNewPage();
      ctx.drawPageNumber?.();
      ctx.y = ctx.textAreaTop;
      if (headers.length && rowsDrawn > 0) {
        ctx.applyFont(ctx.doc, 'bold');
        ctx.doc.setFontSize(fontSize);
        headers.forEach((cell, ci) => {
          ctx.doc.text(cell, ctx.textStartX(ctx.absolutePage) + ci * colW, ctx.y);
        });
        ctx.y += rowH;
      }
      continue;
    }

    let toDraw = Math.min(rowsFit, remaining);
    if (toDraw < remaining && remaining - toDraw < 2 && rowsDrawn > 0) {
      ctx.addNewPage();
      ctx.drawPageNumber?.();
      ctx.y = ctx.textAreaTop;
      continue;
    }

    for (let i = 0; i < toDraw; i++) {
      const row = allRows[rowsDrawn + i];
      const isHeaderRow = headers.length > 0 && rowsDrawn + i === 0 && isFirst;
      ctx.applyFont(ctx.doc, isHeaderRow ? 'bold' : 'normal');
      ctx.doc.setFontSize(fontSize);
      row.forEach((cell, ci) => {
        const lines = splitTextToSizeLang(ctx.doc, cell, colW - 2, ctx.language);
        ctx.doc.text(lines[0] ?? '', ctx.textStartX(ctx.absolutePage) + ci * colW, ctx.y);
      });
      ctx.y += rowH;
    }
    rowsDrawn += toDraw;
    isFirst = false;
  }

  ctx.y += lineH * 0.5;
  return ctx.y;
}

export function renderSemanticHtmlBody(
  ctx: SemanticRenderContext,
  html: string
): number {
  const blocks = extractSemanticBlocks(html);
  if (blocks.length === 0) {
    return renderParagraphLines(ctx, html, PT_BODY);
  }

  const isHeadingTag = (tag: string) => tag === 'h1' || tag === 'h2' || tag === 'h3';

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];
    const nextIsHeading = next ? isHeadingTag(next.tag) : false;

    if (isHeadingTag(block.tag)) {
      if (i > 0 && ctx.y > ctx.textAreaTop + 2) {
        ctx.y += HEADING_GAP_BEFORE_MM;
      }
      ctx.y = renderHeading(ctx, block.inner, block.tag);
    } else if (block.tag === 'table') {
      ctx.y = renderTable(ctx, block.outerHtml ?? block.inner);
    } else if (block.tag === 'ul' || block.tag === 'ol') {
      const items = block.inner.match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
      for (let li = 0; li < items.length; li++) {
        const inner = items[li].replace(/<\/?li[^>]*>/gi, '');
        const isLastItem = li === items.length - 1;
        ctx.y = renderParagraphLines(
          ctx,
          `• ${stripHtmlToPlain(inner)}`,
          PT_BODY,
          { trailingGap: !(isLastItem && nextIsHeading) }
        );
      }
    } else if (block.tag === 'blockquote') {
      ctx.y = renderParagraphLines(ctx, block.inner, PT_BODY, { trailingGap: !nextIsHeading });
    } else {
      ctx.y = renderParagraphLines(ctx, block.inner, PT_BODY, { trailingGap: !nextIsHeading });
    }
  }

  return ctx.y;
}
