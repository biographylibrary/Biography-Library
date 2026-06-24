import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { Language } from '@/lib/i18n/translations';
import { translations } from '@/lib/i18n/translations';
import { stripHtmlToPlain } from '@/lib/import/html-blocks';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'blockquote', 'hr', 'sup', 'sub',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g;

export const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
  "p[style-name='Titolo 1'] => h1:fresh",
  "p[style-name='Titre 1'] => h1:fresh",
  "p[style-name='Überschrift 1'] => h1:fresh",
  "p[style-name='Titolo 2'] => h2:fresh",
  "p[style-name='Titre 2'] => h2:fresh",
  "p[style-name='Überschrift 2'] => h2:fresh",
  "p[style-name='Titolo 3'] => h3:fresh",
  "p[style-name='Titre 3'] => h3:fresh",
  "p[style-name='Überschrift 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "r[style-name='Strong'] => strong",
  "b => strong",
  "i => em",
];

export interface HtmlHeadingChunk {
  title: string;
  html: string;
}

function normalizeTagName(tag: string): string {
  const t = tag.toLowerCase();
  if (t === 'b') return 'strong';
  if (t === 'i') return 'em';
  return t;
}

/** Server-safe sanitizer (no DOM). */
export function sanitizeHtmlString(html: string): string {
  let out = html.replace(CONTROL_CHARS, '');
  out = out.replace(/<(\/?)([\w]+)([^>]*)>/gi, (_m, slash, tagName, attrs) => {
    const tag = normalizeTagName(tagName);
    if (!ALLOWED_TAGS.has(tag)) {
      return slash ? '' : '';
    }
    if (tag === 'br' || tag === 'hr') return `<${tag}>`;
    if (slash) return `</${tag}>`;
    return `<${tag}>`;
  });
  out = out.replace(/<p>\s*<\/p>/gi, '');
  out = out.replace(/<h([123])>\s*<\/h\1>/gi, '');
  return out.trim();
}

/** Client-side sanitizer with DOM when available. */
export function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') {
    return sanitizeHtmlString(html);
  }

  const allowedTags = Array.from(ALLOWED_TAGS);

  const div = document.createElement('div');
  div.innerHTML = html.replace(CONTROL_CHARS, '');

  const walk = (element: Element) => {
    Array.from(element.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (!allowedTags.includes(tag)) {
        const textNode = document.createTextNode(child.textContent || '');
        child.replaceWith(textNode);
      } else {
        Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
        walk(child);
      }
    });
  };

  walk(div);
  return div.innerHTML.trim();
}

export function splitHtmlByTopHeadings(
  html: string,
  level: 'h1' | 'h2' = 'h1'
): HtmlHeadingChunk[] {
  const re = new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)<\\/${level}>`, 'gi');
  const matches = Array.from(html.matchAll(re));
  if (matches.length === 0) return [];

  const chunks: HtmlHeadingChunk[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    const title = stripHtmlToPlain(match[1]);
    const start = match.index ?? 0;
    const before = html.slice(lastEnd, start).trim();
    if (before && chunks.length === 0 && before.replace(/<[^>]+>/g, '').trim()) {
      chunks.push({ title: '', html: before });
    }
    const nextStart = start + match[0].length;
    const nextHeading = html.slice(nextStart).search(new RegExp(`<${level}\\b`, 'i'));
    const bodyEnd = nextHeading === -1 ? html.length : nextStart + nextHeading;
    const body = html.slice(nextStart, bodyEnd).trim();
    chunks.push({ title, html: body });
    lastEnd = bodyEnd;
  }

  return chunks.filter((c) => c.title || c.html.trim());
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

export function matchSectionTitle(
  title: string,
  language: Language = 'en'
): { key: string; confidence: 'high' | 'medium' | 'low' } | null {
  const norm = normalizeTitle(title);
  if (!norm) return null;

  for (const section of BIOGRAPHY_SECTIONS) {
    if (normalizeTitle(section.key) === norm || normalizeTitle(section.title) === norm) {
      return { key: section.key, confidence: 'high' };
    }
    const localized =
      translations[language].sectionTitles[
        section.key as keyof typeof translations.en.sectionTitles
      ];
    if (localized && normalizeTitle(localized) === norm) {
      return { key: section.key, confidence: 'high' };
    }
  }

  for (const section of BIOGRAPHY_SECTIONS) {
    const localized =
      translations[language].sectionTitles[
        section.key as keyof typeof translations.en.sectionTitles
      ];
    const candidates = [section.key, section.title, localized].filter(Boolean) as string[];
    for (const c of candidates) {
      const cn = normalizeTitle(c);
      if (cn && (norm.includes(cn) || cn.includes(norm)) && norm.length >= 4) {
        return { key: section.key, confidence: 'medium' };
      }
    }
  }

  return null;
}

export function detectSectionsFromHtml(
  html: string,
  language: Language = 'en'
): Array<{ title: string; content: string; sectionKey: string | null; confidence: 'high' | 'medium' | 'low' | 'none' }> | null {
  const chunks = splitHtmlByTopHeadings(html, 'h1');
  if (chunks.length <= 1 && !chunks[0]?.title) return null;

  return chunks.map((chunk) => {
    if (!chunk.title) {
      return { title: '', content: chunk.html, sectionKey: null, confidence: 'none' as const };
    }
    const match = matchSectionTitle(chunk.title, language);
    return {
      title: chunk.title,
      content: chunk.html,
      sectionKey: match?.key ?? null,
      confidence: match?.confidence ?? ('none' as const),
    };
  });
}

export function normalizeImportedHtml(html: string): string {
  return sanitizeHtml(html);
}
