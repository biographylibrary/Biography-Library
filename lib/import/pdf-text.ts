/** B5 page used for the printed book: 176 × 250 mm. */
export const B5_COVER_ASPECT = 176 / 250;

export interface PdfSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
  italic: boolean;
}

export function coverFitsB5(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  const aspect = width / height;
  return Math.abs(aspect - B5_COVER_ASPECT) / B5_COVER_ASPECT < 0.02;
}

export function fontStyleFlags(fontFamily: string): { bold: boolean; italic: boolean } {
  const name = fontFamily.toLowerCase();
  return {
    bold: /bold|black|heavy|semibold|demi/.test(name),
    italic: /italic|oblique/.test(name),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapSpan(span: PdfSpan): string {
  let text = escapeHtml(span.text);
  if (!text) return '';
  if (span.bold) text = `<strong>${text}</strong>`;
  if (span.italic) text = `<em>${text}</em>`;
  return text;
}

function lineHtml(line: PdfSpan[]): string {
  const ordered = [...line].sort((a, b) => a.x - b.x);
  let out = '';
  let cursor = ordered[0]?.x ?? 0;
  for (const span of ordered) {
    if (out && span.x > cursor + Math.max(1, span.size * 0.18)) out += ' ';
    out += wrapSpan(span);
    cursor = Math.max(cursor, span.x + Math.max(span.width, 0));
  }
  return out;
}

function linePlain(line: PdfSpan[]): string {
  return line
    .map((span) => span.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turns positioned PDF text into HTML. A clearly larger line becomes a chapter title. */
export function spansToHtml(spans: PdfSpan[]): string {
  const usable = spans.filter((span) => span.text.trim().length > 0 || span.text.includes(' '));
  if (usable.length === 0) return '';

  const sizes = usable.map((span) => span.size).filter((size) => size > 0).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 12;
  const headingMin = median * 1.45;

  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfSpan[][] = [];
  for (const span of sorted) {
    const current = lines[lines.length - 1];
    const tolerance = Math.max(2, span.size * 0.35);
    if (current && Math.abs(span.y - current[0].y) <= tolerance) current.push(span);
    else lines.push([span]);
  }

  const blocks: string[] = [];
  let paragraph: string[] = [];
  let previousY: number | null = null;
  let previousSize = median;

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.join(' ')}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const plain = linePlain(line);
    if (!plain) continue;
    const size = Math.max(...line.map((span) => span.size));
    const y = line[0].y;
    const isHeading = size >= headingMin && plain.length <= 90 && !/[.!?…]$/.test(plain);
    if (isHeading) {
      flush();
      blocks.push(`<h1>${escapeHtml(plain)}</h1>`);
    } else {
      if (previousY != null && previousY - y > previousSize * 1.65) flush();
      paragraph.push(lineHtml(line));
    }
    previousY = y;
    previousSize = size;
  }
  flush();
  return blocks.join('');
}
