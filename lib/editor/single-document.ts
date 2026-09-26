import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { looksLikeStoredHtml, storedToArchiveMarkdown } from '@/lib/archive-markdown';

export interface ChapterAnchor {
  index: number;
  title: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function htmlHasText(html: string | null | undefined): boolean {
  if (!html) return false;
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 0;
}

export function listChapterAnchors(stored: string | null | undefined): ChapterAnchor[] {
  if (!stored) return [];
  if (looksLikeStoredHtml(stored)) {
    const anchors: ChapterAnchor[] = [];
    const pattern = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(stored))) {
      const title = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!title) continue;
      anchors.push({ index: anchors.length, title });
    }
    return anchors;
  }

  const anchors: ChapterAnchor[] = [];
  for (const line of stored.split('\n')) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const title = match[1].replace(/\s+/g, ' ').trim();
    if (!title) continue;
    anchors.push({ index: anchors.length, title });
  }
  return anchors;
}

export function sectionsToDocumentHtml(
  sections: Array<{ title: string; content: string }>
): string {
  return sections
    .map((section) => {
      const body = section.content || '';
      const title = section.title.trim();
      if (!title) return body;
      return `<h1>${escapeHtml(title)}</h1>${body}`;
    })
    .join('');
}

export function appendChapter(stored: string, title: string): string {
  const heading = `# ${title.trim()}`;
  const base = storedToArchiveMarkdown(stored).replace(/\s+$/, '');
  if (!base) return heading;
  return `${base}\n\n${heading}\n`;
}

/**
 * One sheet. An existing free-text document is kept as-is.
 * Otherwise each section that already has text becomes a chapter.
 * Empty preset sections are left out.
 */
export function composeSingleDocument(
  content: BiographyContent,
  freeflow: string | null | undefined,
  sectionTitle: (key: string) => string
): string {
  if (htmlHasText(freeflow)) return freeflow ?? '';

  const parts: string[] = [];
  for (const section of BIOGRAPHY_SECTIONS) {
    const text = getSectionData(content, section.key).text;
    if (!htmlHasText(text)) continue;
    if (/^\s*<h1\b/i.test(text)) {
      parts.push(text);
    } else {
      parts.push(`<h1>${escapeHtml(sectionTitle(section.key))}</h1>${text}`);
    }
  }
  return parts.join('');
}
