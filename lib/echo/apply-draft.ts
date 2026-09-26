import type { SupabaseClient } from '@supabase/supabase-js';
import { looksLikeStoredHtml, storedToArchiveMarkdown } from '@/lib/archive-markdown';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

export const MAX_DRAFT_WORDS = 1500;
const FREEFLOW_SECTION_KEY = 'freeflow';

type BiographyContent = Record<
  string,
  { text?: string; todo?: boolean; audioTranscript?: string }
>;

export function isValidDraftSectionKey(key: string): boolean {
  if (key === FREEFLOW_SECTION_KEY) return true;
  return BIOGRAPHY_SECTIONS.some((s) => s.key === key);
}

export function countDraftWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export type DraftPlacement = {
  /** Exact passage already in the document. When it matches, the draft replaces it. */
  replaceText?: string;
  /** When true, every occurrence of replaceText is changed, not only the first. */
  replaceAll?: boolean;
  /** Chapter heading to insert under, when the draft is new text. */
  chapterTitle?: string;
  /** What the author just asked, used to tell a change from new text. */
  instruction?: string;
  /** Paragraph the cursor was in, when they asked to change a sentence. */
  focusText?: string;
};

export type PlaceDraftResult =
  | { ok: true; text: string; mode: 'replaced' | 'appended' | 'dashes' }
  | { ok: false; code: 'replace_not_found' };

export type EditIntent = 'dashes_to_commas' | 'replace' | 'append' | 'unknown';

export function classifyEditIntent(instruction: string | undefined): EditIntent {
  const text = (instruction ?? '').toLowerCase();
  const mentionsDash =
    /trattin|em dash|long dash|tiret/.test(text) || text.includes('—') || text.includes('–');
  const mentionsComma = /virgol|comma|virgule|komma/.test(text);
  if (mentionsDash && mentionsComma) return 'dashes_to_commas';
  const wantsReplace = /sostitu|replac|cambia|correg|rimpiazz|al posto|remplace|ersetze|ändere/.test(text);
  const wantsAppend = /aggiung|in fondo|add this|add it|append|ajoute|hinzufüg|füge/.test(text);
  if (wantsAppend && !wantsReplace) return 'append';
  if (wantsReplace) return 'replace';
  return 'unknown';
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function sentenceScore(current: string, draft: string): number {
  const left = wordsOf(current);
  const right = wordsOf(draft);
  if (!left.length || !right.length) return 0;
  let lead = 0;
  const limit = Math.min(left.length, right.length);
  while (lead < limit && left[lead] === right[lead]) lead += 1;
  const rightSet = new Set(right.filter((word) => word.length > 3));
  const leftContent = left.filter((word) => word.length > 3);
  const seen = new Set<string>();
  let shared = 0;
  for (const word of leftContent) {
    if (seen.has(word)) continue;
    seen.add(word);
    if (rightSet.has(word)) shared += 1;
  }
  let onlyRight = 0;
  rightSet.forEach((word) => {
    if (!seen.has(word)) onlyRight += 1;
  });
  const union = seen.size + onlyRight;
  const overlap = union ? shared / union : 0;
  if (lead >= 3) return Math.max(overlap, 0.82);
  if (lead >= 2 && overlap >= 0.2) return Math.max(overlap, 0.64);
  return overlap;
}

function findSentences(source: string): { start: number; end: number; text: string }[] {
  const found: { start: number; end: number; text: string }[] = [];
  const pattern = /[^\n.!?…]+(?:[.!?…]+)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const raw = match[0];
    const text = raw.trim();
    if (text.length < 12) continue;
    const start = match.index + raw.indexOf(text);
    found.push({ start, end: start + text.length, text });
  }
  return found;
}

function replaceBestSentence(source: string, draft: string): string | null {
  const sentences = findSentences(source);
  let best: { start: number; end: number; score: number } | null = null;
  let second = 0;
  for (const sentence of sentences) {
    const score = sentenceScore(sentence.text, draft);
    if (!best || score > best.score) {
      second = best?.score ?? 0;
      best = { start: sentence.start, end: sentence.end, score };
    } else if (score > second) {
      second = score;
    }
  }
  if (!best || best.score < 0.55) return null;
  if (best.score - second < 0.08 && best.score < 0.75) return null;
  return source.slice(0, best.start) + draft.trim() + source.slice(best.end);
}

function quotedPassages(instruction: string): string[] {
  const found: string[] = [];
  const patterns = [/«([^»]{8,800})»/g, /"([^"]{8,800})"/g, /“([^”]{8,800})”/g];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(instruction))) {
      const text = match[1].trim();
      if (text) found.push(text);
    }
  }
  return found;
}

export function replaceLongDashes(text: string): { text: string; count: number } {
  let count = 0;
  const next = text.replace(/[ \t]*[—–][ \t]*/g, () => {
    count += 1;
    return ', ';
  });
  return { text: next, count };
}

function literalText(value: string | undefined): string {
  if (!value || !value.trim()) return '';
  if (looksLikeStoredHtml(value)) return storedToArchiveMarkdown(value);
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Plain words as they will appear in the editor, without markdown marks. */
export function plainDraftText(draft: string): string {
  return storedToArchiveMarkdown(draft)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`]/g, '')
    .trim();
}

function replaceExact(
  source: string,
  target: string,
  replacement: string,
  all: boolean
): string | null {
  if (!target || !source.includes(target)) return null;
  if (all) return source.split(target).join(replacement);
  const index = source.indexOf(target);
  return source.slice(0, index) + replacement + source.slice(index + target.length);
}

function replaceFirstFlexible(source: string, target: string, replacement: string): string | null {
  const words = target.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3 || target.trim().length < 12) return null;
  const pattern = new RegExp(words.map(escapeRegExp).join('\\s+'));
  if (!pattern.test(source)) return null;
  return source.replace(pattern, () => replacement);
}

function insertUnderChapter(source: string, chapterTitle: string, draft: string): string | null {
  const lines = source.split('\n');
  const wanted = normalizeTitle(chapterTitle);
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,3})\s+(.+)$/.exec(lines[i].trim());
    if (!match) continue;
    if (normalizeTitle(match[2]) === wanted) {
      startLine = i;
      break;
    }
  }
  if (startLine < 0) return null;

  let endLine = lines.length;
  for (let i = startLine + 1; i < lines.length; i++) {
    if (/^#{1,3}\s+/.test(lines[i].trim())) {
      endLine = i;
      break;
    }
  }

  const chapterBody = lines.slice(startLine + 1, endLine).join('\n').trim();
  if (chapterBody.endsWith(draft)) return source;

  const before = lines.slice(0, endLine).join('\n').replace(/\s+$/, '');
  const after = lines.slice(endLine).join('\n').replace(/^\s+/, '');
  const sep = before ? '\n\n' : '';
  const tail = after ? `\n\n${after}` : '';
  return `${before}${sep}${draft}${tail}`;
}

/**
 * Put Echo's prose into the one document.
 * A matching passage is replaced. If that passage is missing, nothing is added.
 * New prose, with no passage to replace, is added under the named chapter or at the end.
 */
export function placeDraftInDocument(
  current: string,
  draftText: string,
  placement: DraftPlacement = {}
): PlaceDraftResult {
  const base = storedToArchiveMarkdown(current);
  const draft = literalText(draftText);
  const replaceText = literalText(placement.replaceText);
  const intent = classifyEditIntent(placement.instruction);
  const focusText = literalText(placement.focusText);

  if (intent === 'dashes_to_commas') {
    const dashes = replaceLongDashes(base);
    if (dashes.count === 0) return { ok: false, code: 'replace_not_found' };
    return { ok: true, text: dashes.text, mode: 'dashes' };
  }

  if (replaceText) {
    const exact = replaceExact(base, replaceText, draft, placement.replaceAll === true);
    if (exact !== null) return { ok: true, text: exact, mode: 'replaced' };
    if (!placement.replaceAll) {
      const flexible = replaceFirstFlexible(base, replaceText, draft);
      if (flexible !== null) return { ok: true, text: flexible, mode: 'replaced' };
    }
    return { ok: false, code: 'replace_not_found' };
  }

  if (intent !== 'append' && draft) {
    for (const quote of quotedPassages(placement.instruction ?? '')) {
      if (quote && base.includes(quote)) {
        const index = base.indexOf(quote);
        return {
          ok: true,
          text: base.slice(0, index) + draft.trim() + base.slice(index + quote.length),
          mode: 'replaced',
        };
      }
    }

    if (intent === 'replace' && focusText && base.includes(focusText) && focusText.trim().length >= 12) {
      const focusSentences = findSentences(focusText);
      if (focusSentences.length <= 1) {
        const index = base.indexOf(focusText);
        return {
          ok: true,
          text: base.slice(0, index) + draft.trim() + base.slice(index + focusText.length),
          mode: 'replaced',
        };
      }
    }

    const similar = replaceBestSentence(base, draft);
    if (similar !== null) return { ok: true, text: similar, mode: 'replaced' };
    if (intent === 'replace') return { ok: false, code: 'replace_not_found' };
  }

  if (!draft) return { ok: true, text: base, mode: 'appended' };

  const chapterTitle = placement.chapterTitle?.trim();
  if (chapterTitle && intent !== 'replace') {
    const underChapter = insertUnderChapter(base, chapterTitle, draft.trim());
    if (underChapter !== null) return { ok: true, text: underChapter, mode: 'appended' };
  }

  if (!base.trim()) return { ok: true, text: draft.trim(), mode: 'appended' };
  if (base.replace(/\s+$/, '').endsWith(draft.trim())) return { ok: true, text: base, mode: 'appended' };
  const sep = base.endsWith('\n') ? '\n' : '\n\n';
  return { ok: true, text: `${base.replace(/\s+$/, '')}${sep}${draft.trim()}`, mode: 'appended' };
}

export async function appendDraftToBiography(
  serviceClient: SupabaseClient,
  userId: string,
  biographyId: string,
  sectionKey: string,
  draftText: string,
  placement: DraftPlacement = {}
): Promise<
  | { ok: true; sectionKey: string; appendedWords: number; totalWords: number; mode: 'replaced' | 'appended' | 'dashes' }
  | { ok: false; error: string; code?: 'replace_not_found' }
> {
  const trimmed = draftText.trim();
  if (!isValidDraftSectionKey(sectionKey)) {
    return { ok: false, error: 'Invalid sectionKey' };
  }
  if (!trimmed) {
    return { ok: false, error: 'draftText is required' };
  }

  const words = countDraftWords(trimmed);
  if (words > MAX_DRAFT_WORDS) {
    return {
      ok: false,
      error: `Draft exceeds ${MAX_DRAFT_WORDS} words (${words} provided)`,
    };
  }

  const { data: bio, error: fetchErr } = await serviceClient
    .from('biographies')
    .select('content, content_freeflow')
    .eq('id', biographyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr || !bio) {
    return { ok: false, error: 'Biography not found' };
  }

  if (sectionKey === FREEFLOW_SECTION_KEY) {
    const current = String((bio as { content_freeflow?: string }).content_freeflow ?? '');
    const placed = placeDraftInDocument(
      current,
      placement.replaceText ? draftText : trimmed,
      placement
    );
    if (!placed.ok) {
      return { ok: false, error: 'Text to replace was not found', code: placed.code };
    }
    const newText = placed.text;

    const { error: updateErr } = await serviceClient
      .from('biographies')
      .update({ content_freeflow: newText })
      .eq('id', biographyId)
      .eq('user_id', userId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    return {
      ok: true,
      sectionKey,
      appendedWords: words,
      totalWords: countDraftWords(newText),
      mode: placed.mode,
    };
  }

  const content: BiographyContent = {
    ...((bio as { content?: BiographyContent }).content ?? {}),
  };
  const current = content[sectionKey]?.text ?? '';
  const placed = placeDraftInDocument(
    current,
    placement.replaceText ? draftText : trimmed,
    placement
  );
  if (!placed.ok) {
    return { ok: false, error: 'Text to replace was not found', code: placed.code };
  }
  const newText = placed.text;
  content[sectionKey] = {
    ...(content[sectionKey] ?? { todo: false, audioTranscript: '' }),
    text: newText,
  };

  const { error: updateErr } = await serviceClient
    .from('biographies')
    .update({ content })
    .eq('id', biographyId)
    .eq('user_id', userId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  return {
    ok: true,
    sectionKey,
    appendedWords: words,
    totalWords: countDraftWords(newText),
    mode: placed.mode,
  };
}
