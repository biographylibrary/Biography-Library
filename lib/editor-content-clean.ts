/**
 * Unique cleanup for paste and import: drop marks the archive editor does not
 * keep; preserve author text. Tables become paragraphs (reading order);
 * images are removed. Word list paragraphs become real lists.
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

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'section',
  'article',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'hr',
  'br',
]);

/** Bullet glyphs Word / web paste when mso-list is missing. */
const FALLBACK_BULLET = /^(?:[·•o§])\s+/u;

/** Numbered / lettered markers: 1. 1) a. a) A. A) */
const FALLBACK_ORDERED = /^([0-9]+|[A-Za-z])[.)]\s+/;

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagName(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hasBlockChild(nodes: Node[]): boolean {
  return nodes.some((n) => isElement(n) && BLOCK_TAGS.has(tagName(n)));
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
    // Nested blocks inside inline context: keep their text with a space boundary.
    if (BLOCK_TAGS.has(tag)) {
      const inner = serializeCleanInline(node.childNodes).trim();
      if (!inner) continue;
      if (out && !/\s$/.test(out)) out += ' ';
      out += inner;
      continue;
    }
    out += serializeCleanInline(node.childNodes);
  }
  return out;
}

/** Strip a single wrapping <strong>/<b> (Word heading style), keep real inner marks. */
function unwrapHeadingStyleBold(inner: string): string {
  const trimmed = inner.trim();
  const m = /^<(strong|b)>([\s\S]*)<\/\1>$/i.exec(trimmed);
  return m ? m[2] : inner;
}

/** Plain text of a node for list-marker detection. */
function plainInlineText(nodes: Node[]): string {
  return serializeCleanInline(nodes)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function isMsoListParagraph(el: HTMLElement): boolean {
  const cls = `${el.getAttribute('class') ?? ''}`.toLowerCase();
  if (cls.includes('msolistparagraph') || cls.includes('mso-list')) return true;
  const style = `${el.getAttribute('style') ?? ''}`.toLowerCase();
  return style.includes('mso-list');
}

function listKindFromPlain(plain: string): { kind: 'ul' | 'ol'; body: string } | null {
  const ordered = FALLBACK_ORDERED.exec(plain);
  if (ordered) {
    return { kind: 'ol', body: plain.slice(ordered[0].length).trim() };
  }
  const bullet = FALLBACK_BULLET.exec(plain);
  if (bullet) {
    return { kind: 'ul', body: plain.slice(bullet[0].length).trim() };
  }
  return null;
}

function headingTagFor(tag: string): 'h1' | 'h2' | 'h3' {
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') return tag;
  return 'h3';
}

/** One plain string per table cell / row fragment, reading order. */
function cellTexts(table: HTMLElement): string[] {
  const texts: string[] = [];

  const pushCellContent = (cell: HTMLElement) => {
    if (hasBlockChild(cell.childNodes)) {
      // Separate block children inside a cell (e.g. multiple <p>).
      for (const child of cell.childNodes) {
        if (child.nodeType === NodeType.TEXT_NODE) {
          const t = (child.text ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
          if (t) texts.push(t);
          continue;
        }
        if (!isElement(child)) continue;
        const tag = tagName(child);
        if (tag === 'table') {
          texts.push(...cellTexts(child));
          continue;
        }
        if (DROP_TAGS.has(tag)) continue;
        if (tag === 'p' || tag === 'div' || tag === 'li') {
          const t = plainInlineText(child.childNodes);
          if (t) texts.push(t);
          continue;
        }
        const t = plainInlineText([child]);
        if (t) texts.push(t);
      }
      return;
    }
    const t = plainInlineText(cell.childNodes);
    if (t) texts.push(t);
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
        pushCellContent(child);
      }
    }
  };

  walkRows(table);
  if (texts.length === 0) {
    for (const cell of table.querySelectorAll('th, td')) {
      if (!isElement(cell)) continue;
      pushCellContent(cell);
    }
  }
  return texts;
}

type ListBuffer = { kind: 'ul' | 'ol'; items: string[] };

function flushList(buffer: ListBuffer | null, parts: string[]): ListBuffer | null {
  if (!buffer || buffer.items.length === 0) return null;
  const lis = buffer.items.map((item) => `<li><p>${item}</p></li>`).join('');
  parts.push(`<${buffer.kind}>${lis}</${buffer.kind}>`);
  return null;
}

function serializeCleanBlocks(nodes: Node[], warnings: Set<ContentCleanWarning>): string {
  const parts: string[] = [];
  let listBuffer: ListBuffer | null = null;

  const pushParagraph = (inner: string) => {
    listBuffer = flushList(listBuffer, parts);
    if (inner) parts.push(`<p>${inner}</p>`);
  };

  const pushRaw = (html: string) => {
    listBuffer = flushList(listBuffer, parts);
    if (html) parts.push(html);
  };

  const tryConsumeAsListItem = (el: HTMLElement): boolean => {
    const mso = isMsoListParagraph(el);
    const plain = plainInlineText(el.childNodes);
    if (!plain) return false;

    let kind: 'ul' | 'ol' | null = null;
    let bodyHtml = '';

    const fromMarker = listKindFromPlain(plain);
    if (fromMarker) {
      kind = fromMarker.kind;
      bodyHtml = escapeHtmlText(fromMarker.body);
    } else if (mso) {
      // mso-list without a visible marker we recognize → bullet, keep full text.
      kind = 'ul';
      bodyHtml = escapeHtmlText(plain);
    } else {
      return false;
    }

    if (!bodyHtml.trim()) return false;
    if (!listBuffer || listBuffer.kind !== kind) {
      listBuffer = flushList(listBuffer, parts);
      listBuffer = { kind, items: [] };
    }
    listBuffer.items.push(bodyHtml.trim());
    return true;
  };

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const t = node.text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) pushParagraph(escapeHtmlText(t));
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
      listBuffer = flushList(listBuffer, parts);
      for (const cell of cellTexts(node)) {
        parts.push(`<p>${escapeHtmlText(cell)}</p>`);
      }
      continue;
    }

    if (tag === 'hr') {
      pushRaw('<hr>');
      continue;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      listBuffer = flushList(listBuffer, parts);
      const inner = unwrapHeadingStyleBold(serializeCleanInline(node.childNodes).trim());
      if (inner) {
        const h = headingTagFor(tag);
        parts.push(`<${h}>${inner}</${h}>`);
      }
      continue;
    }

    if (tag === 'p') {
      if (tryConsumeAsListItem(node)) continue;
      if (hasBlockChild(node.childNodes)) {
        pushRaw(serializeCleanBlocks(node.childNodes, warnings));
        continue;
      }
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) pushParagraph(inner);
      continue;
    }

    if (tag === 'div' || tag === 'section' || tag === 'article') {
      if (tryConsumeAsListItem(node)) continue;
      if (hasBlockChild(node.childNodes)) {
        pushRaw(serializeCleanBlocks(node.childNodes, warnings));
        continue;
      }
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) pushParagraph(inner);
      continue;
    }

    if (tag === 'blockquote') {
      listBuffer = flushList(listBuffer, parts);
      const inner = serializeCleanBlocks(node.childNodes, warnings);
      if (inner) parts.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      listBuffer = flushList(listBuffer, parts);
      const items = node.childNodes.filter(
        (child): child is HTMLElement => isElement(child) && tagName(child) === 'li'
      );
      if (items.length === 0) continue;
      const lis = items
        .map((li) => {
          if (hasBlockChild(li.childNodes)) {
            const nested = serializeCleanBlocks(li.childNodes, warnings);
            // Prefer first paragraph text inside the item.
            const m = /<p>([\s\S]*?)<\/p>/i.exec(nested);
            const inner = m ? m[1] : plainInlineText(li.childNodes);
            return inner ? `<li><p>${inner}</p></li>` : '';
          }
          const inner = serializeCleanInline(li.childNodes).trim();
          return inner ? `<li><p>${inner}</p></li>` : '';
        })
        .filter(Boolean)
        .join('');
      if (lis) parts.push(`<${tag}>${lis}</${tag}>`);
      continue;
    }

    if (tag === 'li') {
      if (hasBlockChild(node.childNodes)) {
        pushRaw(serializeCleanBlocks(node.childNodes, warnings));
        continue;
      }
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) pushParagraph(inner);
      continue;
    }

    if (UNWRAP_MARKS.has(tag)) {
      if (hasBlockChild(node.childNodes)) {
        pushRaw(serializeCleanBlocks(node.childNodes, warnings));
        continue;
      }
      const inner = serializeCleanInline(node.childNodes).trim();
      if (inner) pushParagraph(inner);
      continue;
    }

    if (node.querySelector('img, picture, svg')) warnings.add('images');
    if (node.querySelector('table')) warnings.add('tables');

    const nested = serializeCleanBlocks(node.childNodes, warnings);
    if (nested) pushRaw(nested);
  }

  flushList(listBuffer, parts);
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
