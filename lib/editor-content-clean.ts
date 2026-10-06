/**
 * Unique cleanup for paste and import: drop marks the archive editor does not
 * keep; preserve author text. Tables become paragraphs (reading order);
 * images are removed.
 */
import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';
import { htmlToArchiveMarkdown } from '@/lib/archive-markdown';

export type ContentCleanWarning = 'tables' | 'images';

export type CleanedEditorContent = {
  markdown: string;
  html: string;
  warnings: ContentCleanWarning[];
};

const DROP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'img',
  'picture',
  'svg',
  'video',
  'audio',
  'iframe',
  'object',
  'embed',
  'canvas',
  'meta',
  'link',
]);

const UNWRAP_MARKS = new Set([
  'u',
  's',
  'strike',
  'del',
  'ins',
  'sup',
  'sub',
  'font',
  'span',
  'mark',
  'code',
  'pre',
  'kbd',
  'samp',
]);

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagName(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

function serializeCleanInline(nodes: Node[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      out += node.text.replace(/\u00a0/g, ' ');
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagName(node);
    if (DROP_TAGS.has(tag)) continue;
    if (tag === 'br') {
      out += '<br>';
      continue;
    }
    if (tag === 'strong' || tag === 'b') {
      const inner = serializeCleanInline(node.childNodes);
      if (inner) out += `<strong>${inner}</strong>`;
      continue;
    }
    if (tag === 'em' || tag === 'i') {
      const inner = serializeCleanInline(node.childNodes);
      if (inner) out += `<em>${inner}</em>`;
      continue;
    }
    if (tag === 'a') {
      const href = (node.getAttribute('href') ?? '').trim();
      const inner = serializeCleanInline(node.childNodes);
      if (inner && /^https?:\/\//i.test(href)) {
        out += `<a href="${href.replace(/"/g, '&quot;')}">${inner}</a>`;
      } else {
        out += inner;
      }
      continue;
    }
    if (UNWRAP_MARKS.has(tag) || tag === 'span') {
      out += serializeCleanInline(node.childNodes);
      continue;
    }
    out += serializeCleanInline(node.childNodes);
  }
  return out;
}

/** One plain string per table cell, reading order (left-to-right, top-to-bottom). */
function cellTexts(table: HTMLElement): string[] {
  const texts: string[] = [];
  const pushPlain = (raw: string) => {
    const parts = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/\n+/)
      .map((part) => part.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    texts.push(...parts);
  };

  const walkRows = (root: HTMLElement) => {
    const rows = [...root.childNodes].filter(
      (n): n is HTMLElement => isElement(n) && tagName(n) === 'tr'
    );
    const sections = [...root.childNodes].filter(
      (n): n is HTMLElement =>
        isElement(n) && ['thead', 'tbody', 'tfoot'].includes(tagName(n))
    );
    for (const section of sections) walkRows(section);
    for (const row of rows) {
      for (const child of row.childNodes) {
        if (!isElement(child)) continue;
        const tag = tagName(child);
        if (tag !== 'th' && tag !== 'td') continue;
        const nestedTables = [...child.childNodes].filter(
          (n): n is HTMLElement => isElement(n) && tagName(n) === 'table'
        );
        if (nestedTables.length > 0) {
          for (const nested of nestedTables) texts.push(...cellTexts(nested));
          continue;
        }
        pushPlain(serializeCleanInline(child.childNodes));
      }
    }
  };

  walkRows(table);
  if (texts.length === 0) {
    for (const cell of table.querySelectorAll('th, td')) {
      if (!isElement(cell)) continue;
      pushPlain(serializeCleanInline(cell.childNodes));
    }
  }
  return texts;
}

function serializeCleanBlocks(nodes: Node[], warnings: Set<ContentCleanWarning>): string {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const t = node.text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) parts.push(`<p>${t}</p>`);
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagName(node);

    if (DROP_TAGS.has(tag)) {
      if (tag === 'img' || tag === 'picture' || tag === 'svg') warnings.add('images');
      continue;
    }

    if (tag === 'table') {
      warnings.add('tables');
      for (const cell of cellTexts(node)) {
        parts.push(`<p>${cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`);
      }
      continue;
    }

    if (tag === 'hr') {
      parts.push('<hr>');
      continue;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) parts.push(`<${tag}>${inner}</${tag}>`);
      continue;
    }
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) parts.push(`<h3>${inner}</h3>`);
      continue;
    }

    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) parts.push(`<p>${inner}</p>`);
      continue;
    }

    if (tag === 'blockquote') {
      const inner = serializeCleanBlocks(node.childNodes, warnings);
      if (inner) parts.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = node.childNodes.filter(
        (child): child is HTMLElement => isElement(child) && tagName(child) === 'li'
      );
      if (items.length === 0) continue;
      const lis = items
        .map((li) => {
          const inner = serializeCleanInline(li.childNodes).trim();
          return inner ? `<li><p>${inner}</p></li>` : '';
        })
        .filter(Boolean)
        .join('');
      if (lis) parts.push(`<${tag}>${lis}</${tag}>`);
      continue;
    }

    if (tag === 'li') {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) parts.push(`<p>${inner}</p>`);
      continue;
    }

    if (UNWRAP_MARKS.has(tag)) {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) parts.push(`<p>${inner}</p>`);
      continue;
    }

    // Detect images nested elsewhere.
    if (node.querySelector('img, picture, svg')) warnings.add('images');
    if (node.querySelector('table')) {
      warnings.add('tables');
    }

    const nested = serializeCleanBlocks(node.childNodes, warnings);
    if (nested) parts.push(nested);
  }

  return parts.join('');
}

/** Clean arbitrary HTML (Word, web, other editors) into archive-safe HTML + Markdown. */
export function cleanEditorIncomingHtml(html: string): CleanedEditorContent {
  const warnings = new Set<ContentCleanWarning>();
  const raw = (html ?? '').trim();
  if (!raw) return { markdown: '', html: '', warnings: [] };

  if (raw.includes('<img') || raw.includes('<picture') || raw.includes('<svg')) {
    warnings.add('images');
  }
  if (/<table\b/i.test(raw)) warnings.add('tables');

  const root = parse(raw, { comment: false });
  const cleanedHtml = serializeCleanBlocks(root.childNodes, warnings);
  const markdown = htmlToArchiveMarkdown(cleanedHtml);
  return {
    markdown,
    html: cleanedHtml,
    warnings: Array.from(warnings),
  };
}

/** Plain pasted text → Markdown paragraph(s). */
export function cleanEditorIncomingPlainText(text: string): CleanedEditorContent {
  const raw = (text ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { markdown: '', html: '', warnings: [] };
  const html = raw
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');
  return cleanEditorIncomingHtml(html);
}
