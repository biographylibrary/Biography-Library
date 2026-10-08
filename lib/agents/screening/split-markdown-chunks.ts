import { createHash } from 'crypto';
import {
  effectiveMaxChunkChars,
  weightedLength,
} from '@/lib/agents/screening/chunk-limits';

export type MarkdownChunk = {
  /** Indice 0-based nell'elenco pezzi. */
  index: number;
  /** Offset assoluto di inizio del body nel testo di origine. */
  start: number;
  /** Offset assoluto di fine del body (esclusivo) nel testo di origine. */
  end: number;
  /** Titolo della parte (ultimo heading ATX visto), o null se non c'è. */
  partTitle: string | null;
  /**
   * Ultimo paragrafo del pezzo precedente, da mandare al modello come contesto
   * (non entra nella concatenazione che ricostruisce il testo).
   */
  context: string;
  /** Testo nuovo di questo pezzo (concatenato con gli altri body = testo originale). */
  body: string;
  /** Testo inviato al modello: contesto marcato + body. */
  modelText: string;
  /** SHA-256 esadecimale del body. */
  fingerprint: string;
};

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const CONTEXT_PREFIX =
  '[CONTEXT — previous paragraph, for continuity only; do not re-judge in isolation]\n';
const CONTEXT_SUFFIX = '\n[END CONTEXT]\n\n';

function fingerprintOf(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildModelText(context: string, body: string): string {
  if (!context) return body;
  return CONTEXT_PREFIX + context + CONTEXT_SUFFIX + body;
}

function lastParagraphOf(text: string): string {
  const parts = text.split(/\n\n+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].trim().length > 0) return parts[i];
  }
  return text;
}

type Para = { text: string; start: number; end: number; partTitle: string | null };

/**
 * Paragrafi = blocchi separati da una o più righe vuote; i separatori restano
 * attaccati al blocco che precede, così la concatenazione è carattere per carattere.
 */
function paragraphsWithOffsets(source: string): Para[] {
  if (source.length === 0) return [];

  const paras: Para[] = [];
  let i = 0;
  let partTitle: string | null = null;

  while (i < source.length) {
    const start = i;
    const blank = source.indexOf('\n\n', i);
    let end: number;
    if (blank === -1) {
      end = source.length;
    } else {
      end = blank + 2;
      while (end < source.length && source[end] === '\n') end++;
    }
    const text = source.slice(start, end);
    const firstLine = text.split('\n', 1)[0] ?? '';
    const heading = HEADING_RE.exec(firstLine);
    if (heading) partTitle = heading[2];
    paras.push({ text, start, end, partTitle });
    i = end;
  }
  return paras;
}

/**
 * Spezza un blocco più pesante del budget, preferendo i newline e rispettando
 * il peso CJK (3 unità).
 */
function hardSlices(text: string, start: number, partTitle: string | null, maxUnits: number): Para[] {
  const out: Para[] = [];
  let local = 0;
  while (local < text.length) {
    let weight = 0;
    let sliceEnd = local;
    let lastNl = -1;
    while (sliceEnd < text.length) {
      const ch = text[sliceEnd]!;
      const w = weightedLength(ch);
      if (weight + w > maxUnits && sliceEnd > local) break;
      weight += w;
      if (ch === '\n') lastNl = sliceEnd;
      sliceEnd += 1;
    }
    if (sliceEnd < text.length && lastNl >= local) {
      sliceEnd = lastNl + 1;
    }
    if (sliceEnd === local) sliceEnd = Math.min(local + 1, text.length);
    out.push({
      text: text.slice(local, sliceEnd),
      start: start + local,
      end: start + sliceEnd,
      partTitle,
    });
    local = sliceEnd;
  }
  return out;
}

/**
 * Divide il Markdown di origine in pezzi lungo i titoli, poi lungo i paragrafi,
 * senza mai spezzare un paragrafo salvo che da solo superi il limite (in unità
 * pesate: CJK = 3). Ogni pezzo porta l'ultimo paragrafo del precedente come contesto.
 */
export function splitMarkdownIntoChunks(
  source: string,
  maxUnits: number = effectiveMaxChunkChars()
): MarkdownChunk[] {
  if (maxUnits < 1) throw new Error('maxChars must be >= 1');

  if (source.length === 0) {
    return [
      {
        index: 0,
        start: 0,
        end: 0,
        partTitle: null,
        context: '',
        body: '',
        modelText: '',
        fingerprint: fingerprintOf(''),
      },
    ];
  }

  const raw = paragraphsWithOffsets(source);
  const units: Para[] = [];
  for (const p of raw) {
    if (weightedLength(p.text) <= maxUnits) units.push(p);
    else units.push(...hardSlices(p.text, p.start, p.partTitle, maxUnits));
  }

  const chunks: MarkdownChunk[] = [];
  let buf: Para[] = [];
  let bufWeight = 0;
  let prevLastPara = '';

  const emit = () => {
    if (buf.length === 0) return;
    const body = buf.map((u) => u.text).join('');
    const context = chunks.length === 0 ? '' : prevLastPara;
    chunks.push({
      index: chunks.length,
      start: buf[0].start,
      end: buf[buf.length - 1].end,
      partTitle: buf[buf.length - 1].partTitle,
      context,
      body,
      modelText: buildModelText(context, body),
      fingerprint: fingerprintOf(body),
    });
    prevLastPara = lastParagraphOf(body);
    buf = [];
    bufWeight = 0;
  };

  for (const unit of units) {
    const unitWeight = weightedLength(unit.text);
    const isHeadingOnly =
      HEADING_RE.test(unit.text.split('\n', 1)[0] ?? '') && unit.text.trim().length < 200;
    if (isHeadingOnly && buf.length > 0 && bufWeight + unitWeight > maxUnits) {
      emit();
    }
    if (bufWeight + unitWeight > maxUnits && buf.length > 0) {
      emit();
    }
    buf.push(unit);
    bufWeight += unitWeight;
  }
  emit();

  const rebuilt = concatenateChunkBodies(chunks);
  if (rebuilt !== source) {
    return hardSlices(source, 0, null, maxUnits).map((u, index, all) => {
      const context = index === 0 ? '' : lastParagraphOf(all[index - 1].text);
      return {
        index,
        start: u.start,
        end: u.end,
        partTitle: null,
        context,
        body: u.text,
        modelText: buildModelText(context, u.text),
        fingerprint: fingerprintOf(u.text),
      };
    });
  }

  return chunks;
}

/** Concatena i body senza il contesto ripetuto: deve riprodurre il testo esatto. */
export function concatenateChunkBodies(chunks: MarkdownChunk[]): string {
  return chunks.map((c) => c.body).join('');
}
