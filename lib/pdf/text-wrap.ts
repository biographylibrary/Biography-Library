import type { jsPDF } from 'jspdf';
import { hyphenateWordSyllables, normalizePdfLanguage } from '@/lib/pdf/hyphenation';

export interface WrappedLine {
  /** Text drawn on the line (may end with `-` for hyphenation). */
  display: string;
  /** Start index in the source plain-text string (inclusive). */
  sourceStart: number;
  /** End index in the source plain-text string (exclusive). */
  sourceEnd: number;
}

function measure(doc: jsPDF, text: string): number {
  return doc.getTextWidth(text);
}

function forceCharBreak(
  doc: jsPDF,
  text: string,
  textStart: number,
  maxWidth: number
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let i = 0;
  while (i < text.length) {
    let lo = i + 1;
    let hi = text.length;
    let best = i + 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const segment = text.slice(i, mid);
      const display = mid < text.length ? `${segment}-` : segment;
      if (measure(doc, display) <= maxWidth) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best <= i) best = Math.min(i + 1, text.length);
    const isLast = best >= text.length;
    lines.push({
      display: isLast ? text.slice(i, best) : `${text.slice(i, best)}-`,
      sourceStart: textStart + i,
      sourceEnd: textStart + best,
    });
    i = best;
  }
  return lines;
}

function hyphenateWordIntoLines(
  doc: jsPDF,
  word: string,
  wordStart: number,
  maxWidth: number,
  language: string
): WrappedLine[] {
  const parts = hyphenateWordSyllables(word, language);
  if (parts.length <= 1) {
    if (measure(doc, word) <= maxWidth) {
      return [{ display: word, sourceStart: wordStart, sourceEnd: wordStart + word.length }];
    }
    return forceCharBreak(doc, word, wordStart, maxWidth);
  }

  const lines: WrappedLine[] = [];
  let offsetInWord = 0;
  let idx = 0;

  while (idx < parts.length) {
    let chunk = '';
    while (idx < parts.length) {
      const next = chunk + parts[idx];
      const withHyphen = idx < parts.length - 1 ? `${next}-` : next;
      if (measure(doc, withHyphen) <= maxWidth) {
        chunk = next;
        idx++;
      } else {
        break;
      }
    }

    if (!chunk) {
      const forced = forceCharBreak(doc, parts[idx], wordStart + offsetInWord, maxWidth);
      lines.push(...forced);
      offsetInWord += parts[idx].length;
      idx++;
      continue;
    }

    const hasMore = idx < parts.length;
    lines.push({
      display: hasMore ? `${chunk}-` : chunk,
      sourceStart: wordStart + offsetInWord,
      sourceEnd: wordStart + offsetInWord + chunk.length,
    });
    offsetInWord += chunk.length;
  }

  return lines;
}

function wrapParagraph(
  doc: jsPDF,
  para: string,
  baseOffset: number,
  maxWidth: number,
  language: string
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let lineStart = baseOffset;
  let lineDisplay = '';
  let i = 0;

  const emitLine = (sourceEnd: number) => {
    const trimmed = lineDisplay.trimEnd();
    if (!trimmed) {
      lineDisplay = '';
      lineStart = sourceEnd;
      return;
    }
    lines.push({ display: trimmed, sourceStart: lineStart, sourceEnd });
    lineDisplay = '';
    lineStart = sourceEnd;
  };

  while (i < para.length) {
    if (!lineDisplay && para[i] === ' ') {
      i++;
      lineStart = baseOffset + i;
      continue;
    }

    const wordStartRel = i;
    while (i < para.length && para[i] !== ' ') i++;
    const word = para.slice(wordStartRel, i);
    const wordStart = baseOffset + wordStartRel;

    let space = '';
    if (i < para.length && para[i] === ' ') {
      space = ' ';
      i++;
    }

    const attempt = lineDisplay + word + space;
    if (measure(doc, attempt) <= maxWidth) {
      lineDisplay = attempt;
      continue;
    }

    if (lineDisplay.trimEnd()) {
      emitLine(wordStart);
      i = wordStartRel;
      continue;
    }

    const wordLines = hyphenateWordIntoLines(doc, word, wordStart, maxWidth, language);
    for (let h = 0; h < wordLines.length - 1; h++) {
      lines.push(wordLines[h]);
    }
    const last = wordLines[wordLines.length - 1];
    lineDisplay = last.display + space;
    lineStart = last.sourceStart;
  }

  if (lineDisplay.trimEnd()) {
    emitLine(baseOffset + para.length);
  }

  return lines;
}

/** Word-wrap with language-aware hyphenation for PDF body text. */
export function wrapTextToLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  language: string
): WrappedLine[] {
  normalizePdfLanguage(language);
  const result: WrappedLine[] = [];
  const chunks = text.split(/(\n)/);
  let offset = 0;

  for (const chunk of chunks) {
    if (chunk === '\n') {
      offset += 1;
      continue;
    }
    if (chunk.length > 0) {
      result.push(...wrapParagraph(doc, chunk, offset, maxWidth, language));
    }
    offset += chunk.length;
  }

  return result;
}

/** Convenience helper returning display strings only. */
export function splitTextToSizeLang(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  language: string
): string[] {
  return wrapTextToLines(doc, text, maxWidth, language).map((l) => l.display);
}
