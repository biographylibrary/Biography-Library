/**
 * Conversione in prova dell’HTML già salvato verso il Markdown d’archivio.
 * Non scrive da sola: lo script decide, e una scheda pubblicata con perdita
 * non viene mai sovrascritta in automatico.
 */

import { parse, NodeType, type Node } from 'node-html-parser';
import { looksLikeStoredHtml, storedToArchiveMarkdown, storedToPlainText } from '@/lib/archive-markdown';
import { nfc } from '@/lib/nfc';

export const BOOK_TEXT_FIELDS = [
  'dedication_content',
  'epigraph_content',
  'epigraph_source',
  'preface_content',
  'epilogue_content',
  'acknowledgements_content',
  'specific_credits_content',
] as const;

const UNSUPPORTED_TAGS = new Set([
  'u',
  's',
  'strike',
  'del',
  'ins',
  'sup',
  'sub',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'img',
  'pre',
  'code',
  'hr',
  'font',
  'h4',
  'h5',
  'h6',
]);

export type FieldKind = 'empty' | 'markdown' | 'clean' | 'formatting_loss' | 'text_loss';

export type FieldAssessment = {
  path: string;
  kind: FieldKind;
  unsupported: string[];
};

export type LegacyAssessment = {
  fields: FieldAssessment[];
  hasHtml: boolean;
  hasTextLoss: boolean;
  hasFormattingLoss: boolean;
};

export type ApplyDecision = 'skip_unchanged' | 'convert' | 'manual_review';

export type StoredField = {
  path: string;
  value: string | null | undefined;
};

function plain(value: string): string {
  return nfc(storedToPlainText(value)).replace(/\s+/g, ' ').trim();
}

function isElementNode(node: Node): node is Node & { rawTagName?: string; tagName?: string; childNodes: Node[]; getAttribute: (name: string) => string | undefined } {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

/** Testo visibile nell’HTML di partenza, alt delle immagini compreso. */
function visibleSourceText(html: string): string {
  const root = parse(html, { comment: false });
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
      return;
    }
    if (!isElementNode(node)) return;
    const tag = (node.rawTagName || node.tagName || '').toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return;
    if (tag === 'img') {
      const alt = (node.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim();
      if (alt) parts.push(alt);
    }
    for (const child of node.childNodes) walk(child);
  };

  for (const child of root.childNodes) walk(child);
  return nfc(parts.join(' ')).replace(/\s+/g, ' ').trim();
}

function unsupportedMarks(html: string): string[] {
  const found = new Set<string>();
  const tagRe = /<\/?([a-z0-9]+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const tag = match[1].toLowerCase();
    if (UNSUPPORTED_TAGS.has(tag)) found.add(tag);
  }
  if (/style\s*=|text-align\s*:|align\s*=/i.test(html)) found.add('style');
  return Array.from(found).sort();
}

export function assessStoredText(path: string, value: string | null | undefined): FieldAssessment {
  const raw = value ?? '';
  if (!raw.trim()) return { path, kind: 'empty', unsupported: [] };
  if (!looksLikeStoredHtml(raw)) return { path, kind: 'markdown', unsupported: [] };

  const unsupported = unsupportedMarks(raw);
  const markdown = storedToArchiveMarkdown(raw);
  if (visibleSourceText(raw) !== plain(markdown)) {
    return { path, kind: 'text_loss', unsupported };
  }
  if (unsupported.length > 0) return { path, kind: 'formatting_loss', unsupported };
  return { path, kind: 'clean', unsupported: [] };
}

export function assessFields(fields: StoredField[]): LegacyAssessment {
  const assessed = fields.map((field) => assessStoredText(field.path, field.value));
  const hasTextLoss = assessed.some((field) => field.kind === 'text_loss');
  const hasFormattingLoss = assessed.some((field) => field.kind === 'formatting_loss');
  const hasHtml = assessed.some(
    (field) => field.kind === 'clean' || field.kind === 'formatting_loss' || field.kind === 'text_loss'
  );
  return { fields: assessed, hasHtml, hasTextLoss, hasFormattingLoss };
}

/**
 * Una perdita di testo non si applica mai da sola.
 * Una perdita di formattazione su una scheda già pubblicata nemmeno:
 * lì il testo è dichiarato immutabile.
 * Sulle bozze la formattazione non archiviabile si può convertire,
 * come fa già il salvataggio dell’editor.
 */
export function decideApply(
  status: string | null | undefined,
  assessment: LegacyAssessment
): ApplyDecision {
  if (!assessment.hasHtml) return 'skip_unchanged';
  if (assessment.hasTextLoss) return 'manual_review';
  if (status === 'published' && assessment.hasFormattingLoss) return 'manual_review';
  return 'convert';
}

export function collectContentFields(content: unknown): StoredField[] {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return [];
  const fields: StoredField[] = [];
  for (const [key, section] of Object.entries(content as Record<string, unknown>)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const text = (section as { text?: unknown }).text;
      if (typeof text === 'string') fields.push({ path: `content.${key}.text`, value: text });
    } else if (typeof section === 'string') {
      fields.push({ path: `content.${key}`, value: section });
    }
  }
  return fields;
}

export function convertedContent(content: unknown): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
  const next: Record<string, unknown> = {};
  for (const [key, section] of Object.entries(content as Record<string, unknown>)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const row = section as { text?: unknown };
      next[key] =
        typeof row.text === 'string'
          ? { ...row, text: storedToArchiveMarkdown(row.text) }
          : section;
    } else if (typeof section === 'string') {
      next[key] = storedToArchiveMarkdown(section);
    } else {
      next[key] = section;
    }
  }
  return next;
}

export function htmlSnapshotFields(fields: StoredField[]): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const field of fields) {
    const value = field.value ?? '';
    if (value.trim() && looksLikeStoredHtml(value)) snapshot[field.path] = value;
  }
  return snapshot;
}
