import { stripHtmlTags } from '@/lib/export-utils';

/** Testo semplice per confrontare traduzione e originale: NFC, spazi collassati, trim. */
export function normalizeComparableText(raw: string | null | undefined): string {
  return (raw ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function plainFromStored(raw: string | null | undefined): string {
  return stripHtmlTags(raw ?? '');
}

type SectionLike = { text?: string | null } | string | null | undefined;

function sectionPlain(value: SectionLike): string {
  if (value == null) return '';
  if (typeof value === 'string') return plainFromStored(value);
  return plainFromStored(value.text ?? '');
}

/**
 * Corpo di lavoro (foglio o sezioni), senza `final_version`.
 */
export function biographyWorkingBodyPlain(input: {
  content?: Record<string, SectionLike> | null;
  content_freeflow?: string | null;
  narrative_order?: string[] | null;
}): string {
  const flow = input.content_freeflow?.trim();
  if (flow) return plainFromStored(flow);

  const content = input.content ?? {};
  const order =
    Array.isArray(input.narrative_order) && input.narrative_order.length > 0
      ? input.narrative_order
      : Object.keys(content);
  return order.map((key) => sectionPlain(content[key])).filter(Boolean).join('\n\n');
}

/** Corpo narrativo: versione finale se c'è, altrimenti foglio/sezioni. */
export function biographyBodyPlain(input: {
  content?: Record<string, SectionLike> | null;
  content_freeflow?: string | null;
  narrative_order?: string[] | null;
  final_version?: string | null;
}): string {
  const finalV = input.final_version?.trim();
  if (finalV) return plainFromStored(finalV);
  return biographyWorkingBodyPlain(input);
}

export function textsAreIdentical(a: string, b: string): boolean {
  return normalizeComparableText(a) === normalizeComparableText(b);
}

/** Vero se l'edizione ha ancora lo stesso testo dell'originale (lavoro o versione finale). */
export function editionTextMatchesOriginal(
  edition: {
    content?: Record<string, SectionLike> | null;
    content_freeflow?: string | null;
    narrative_order?: string[] | null;
    final_version?: string | null;
  },
  original: {
    content?: Record<string, SectionLike> | null;
    content_freeflow?: string | null;
    narrative_order?: string[] | null;
    final_version?: string | null;
  }
): boolean {
  const oWork = biographyWorkingBodyPlain(original);
  const oFinal = plainFromStored(original.final_version);
  const oRef = oFinal || oWork;
  if (!normalizeComparableText(oRef)) return false;

  const eWork = biographyWorkingBodyPlain(edition);
  if (eWork && textsAreIdentical(eWork, oWork || oRef)) return true;

  const eFinal = plainFromStored(edition.final_version);
  if (eFinal && (textsAreIdentical(eFinal, oRef) || (oWork && textsAreIdentical(eFinal, oWork)))) {
    return true;
  }
  return false;
}

export const IDENTICAL_SECTION_MIN_CHARS = 200;

/**
 * Quante sezioni (chiavi in comune) hanno testo ancora uguale all'originale,
 * ignorando quelle sotto i 200 caratteri (dopo normalizzazione).
 */
export function countIdenticalSections(
  editionContent: Record<string, SectionLike> | null | undefined,
  originalContent: Record<string, SectionLike> | null | undefined
): number {
  const edition = editionContent ?? {};
  const original = originalContent ?? {};
  let count = 0;
  for (const key of Object.keys(edition)) {
    const e = normalizeComparableText(sectionPlain(edition[key]));
    if (e.length < IDENTICAL_SECTION_MIN_CHARS) continue;
    const o = normalizeComparableText(sectionPlain(original[key]));
    if (e === o) count += 1;
  }
  return count;
}
