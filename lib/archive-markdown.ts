/**
 * Original conservato: CommonMark + GFM ristretto a titoli, grassetto, corsivo,
 * liste, citazioni, collegamenti, a capo forzati e separatori di scena (***).
 * NFC in scrittura. Il resto (sottolineatura, allineamento, apice, pedice,
 * codice, barrato, tabelle, immagini, HTML grezzo) non entra.
 */
import MarkdownIt from 'markdown-it';
import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';
import { nfc } from '@/lib/nfc';

/**
 * Legacy HTML originals always start (after leading whitespace) with a block tag.
 * Do not scan the whole string: a Markdown author may write "<b>", "se x<a y", "<3", etc.
 */
const LEGACY_HTML_BLOCK_START =
  /^\s*<(?:p|h[1-6]|ul|ol|blockquote|div|hr|br|table|pre)\b/i;

const ARCHIVE_HTML_TAGS = new Set([
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g;

/** Canonical scene separator in stored Markdown. */
export const ARCHIVE_HORIZONTAL_RULE = '***';

function isSafeHref(href: string): boolean {
  // Archive links: only http(s). Never javascript:, data:, or bare hosts.
  return /^https?:\/\//i.test(href.trim());
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function decodeNbsp(text: string): string {
  return text.replace(/&nbsp;/gi, ' ');
}

/** Escape inline Markdown-significant characters without decoding HTML entities. */
function escapeInlineMd(text: string): string {
  return decodeNbsp(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]])/g, '\\$1');
}

/**
 * After inline escaping, stop CommonMark from reading the line as a list,
 * heading, quote or thematic break.
 */
function escapeMarkdownBlockStart(line: string): string {
  if (/^(\s{0,3})([-*_])(?:\s*\2){2,}\s*$/.test(line)) {
    return line.replace(/([-*_])/g, '\\$1');
  }
  if (/^(\s{0,3})(#{1,6})(\s|$)/.test(line)) {
    return line.replace(/^(\s{0,3})#/, '$1\\#');
  }
  if (/^(\s{0,3})([>*+-])(\s|$)/.test(line)) {
    return line.replace(/^(\s{0,3})([>*+-])/, '$1\\$2');
  }
  if (/^(\s{0,3})(\d+)([.)])(\s+|$)/.test(line)) {
    return line.replace(/^(\s{0,3})(\d+)([.)])(\s+|$)/, '$1$2\\$3$4');
  }
  return line;
}

/** Full escape for one plain-text line written as a normal paragraph. */
export function escapeMarkdownBlockLine(line: string): string {
  return escapeMarkdownBlockStart(escapeInlineMd(line));
}

function finalizeParagraphMd(alreadyInlineEscaped: string): string {
  return alreadyInlineEscaped.split('\n').map(escapeMarkdownBlockStart).join('\n');
}

export function looksLikeStoredHtml(text: string): boolean {
  return LEGACY_HTML_BLOCK_START.test(text ?? '');
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagName(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

/** Single element child, ignoring whitespace-only text nodes. */
function onlyElementChild(nodes: Node[]): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      if ((node.text ?? '').replace(/\u00a0/g, ' ').trim()) return null;
      continue;
    }
    if (!isElement(node)) continue;
    if (found) return null;
    found = node;
  }
  return found;
}

function serializeInline(nodes: Node[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      let text = node.text;
      // markdown-it emits a newline text node after <br>; keep a single hard break.
      if (out.endsWith('  \n') && text.startsWith('\n')) {
        text = text.slice(1);
      }
      out += escapeInlineMd(text);
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagName(node);
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (tag === 'br') {
      out += '  \n';
      continue;
    }
    // Bold+italic as **_…_** / _**…**_ — never ***…*** (ambiguous with scene breaks).
    if (tag === 'strong' || tag === 'b') {
      const only = onlyElementChild(node.childNodes);
      if (only && (tagName(only) === 'em' || tagName(only) === 'i')) {
        const inner = serializeInline(only.childNodes);
        if (inner) out += `**_${inner}_**`;
        continue;
      }
      const inner = serializeInline(node.childNodes);
      if (inner) out += `**${inner}**`;
      continue;
    }
    if (tag === 'em' || tag === 'i') {
      const only = onlyElementChild(node.childNodes);
      if (only && (tagName(only) === 'strong' || tagName(only) === 'b')) {
        const inner = serializeInline(only.childNodes);
        if (inner) out += `_**${inner}**_`;
        continue;
      }
      const inner = serializeInline(node.childNodes);
      if (inner) out += `*${inner}*`;
      continue;
    }
    const inner = serializeInline(node.childNodes);
    if (tag === 'a') {
      const href = (node.getAttribute('href') ?? '').trim();
      if (inner && isSafeHref(href)) {
        out += `[${inner.replace(/\]/g, '\\]')}](${href})`;
      } else {
        out += inner;
      }
      continue;
    }
    out += inner;
  }
  return out;
}

function listItemHeadAndNested(li: HTMLElement): { headNodes: Node[]; nested: HTMLElement[] } {
  const nested: HTMLElement[] = [];
  const headNodes: Node[] = [];
  for (const child of li.childNodes) {
    if (isElement(child) && (tagName(child) === 'ul' || tagName(child) === 'ol')) {
      nested.push(child);
      continue;
    }
    if (isElement(child) && tagName(child) === 'p') {
      headNodes.push(...child.childNodes);
      continue;
    }
    headNodes.push(child);
  }
  return { headNodes, nested };
}

function serializeBlocks(nodes: Node[], listIndent = ''): string {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const t = node.text.replace(/\s+/g, ' ').trim();
      if (t) parts.push(finalizeParagraphMd(escapeInlineMd(t)));
      continue;
    }
    if (!isElement(node)) continue;

    const tag = tagName(node);
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (tag === 'br') continue;

    if (tag === 'hr') {
      parts.push(ARCHIVE_HORIZONTAL_RULE);
      continue;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = serializeInline(node.childNodes).trim();
      if (text) parts.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
      continue;
    }
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = serializeInline(node.childNodes).trim();
      if (text) parts.push(`### ${text}`);
      continue;
    }
    if (tag === 'p' || tag === 'div') {
      const text = serializeInline(node.childNodes);
      // Keep hard-break markers (`  \n`); drop other trailing spaces.
      const normalized = text
        .replace(/[ \t]+\n/g, '  \n')
        .replace(/[ \t]+$/g, (m) => (m.length >= 2 ? '  ' : ''));
      if (normalized) parts.push(finalizeParagraphMd(normalized));
      continue;
    }
    if (tag === 'blockquote') {
      const inner = serializeBlocks(node.childNodes).trim();
      if (inner) {
        parts.push(
          inner
            .split('\n')
            .map((line) => (line.length ? `> ${line}` : '>'))
            .join('\n')
        );
      }
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = node.childNodes.filter(
        (child): child is HTMLElement => isElement(child) && tagName(child) === 'li'
      );
      const lines: string[] = [];
      items.forEach((li, index) => {
        const marker = tag === 'ol' ? `${index + 1}. ` : '- ';
        const { headNodes, nested } = listItemHeadAndNested(li);
        // Same block-start protection as paragraphs: "1944." / "#" / "---" inside a
        // list item must not become nested lists, headings or scene breaks.
        const head = finalizeParagraphMd(serializeInline(headNodes).trim());
        lines.push(`${listIndent}${marker}${head}`);
        for (const nest of nested) {
          const nestedMd = serializeBlocks([nest], `${listIndent}  `).trimEnd();
          if (nestedMd) lines.push(nestedMd);
        }
      });
      if (lines.length) parts.push(lines.join('\n'));
      continue;
    }
    if (tag === 'li') {
      const text = finalizeParagraphMd(serializeInline(node.childNodes).trim());
      if (text) parts.push(`${listIndent}- ${text}`);
      continue;
    }

    // Tables / unknown wrappers: keep visible text as paragraphs (cells in order).
    if (tag === 'table') {
      const cells = node.querySelectorAll('th, td');
      for (const cell of cells) {
        const text = serializeInline(cell.childNodes).trim();
        if (text) parts.push(finalizeParagraphMd(text));
      }
      continue;
    }

    const inner = serializeBlocks(node.childNodes, listIndent).trim();
    if (inner) parts.push(inner);
  }

  return parts.join('\n\n');
}

/**
 * CommonMark thematic break: a line that contains only ***, ---, ___, or * * *
 * (three or more of the same marker, optional spaces between, ≤3 leading spaces).
 * Mid-line *** (bold+italic, prose) must not become a scene separator.
 */
const THEMATIC_BREAK_LINE =
  /^[ \t]{0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/;

/** Normalize --- / ___ / * * * thematic breaks to canonical *** with blank lines. */
export function normalizeArchiveHorizontalRules(markdown: string): string {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (THEMATIC_BREAK_LINE.test(line)) {
      while (out.length && out[out.length - 1] === '') out.pop();
      if (out.length) out.push('');
      out.push(ARCHIVE_HORIZONTAL_RULE);
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function htmlToArchiveMarkdown(html: string): string {
  const raw = (html ?? '').replace(CONTROL_CHARS, '').trim();
  if (!raw) return '';
  const root = parse(raw, { comment: false });
  const md = serializeBlocks(root.childNodes)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return nfc(normalizeArchiveHorizontalRules(md));
}

function sanitizeArchiveHtml(html: string): string {
  let out = html.replace(CONTROL_CHARS, '');
  out = out.replace(/<(\/?)([\w]+)([^>]*)>/gi, (_m, slash: string, rawTag: string, attrs: string) => {
    let tag = rawTag.toLowerCase();
    if (tag === 'b') tag = 'strong';
    if (tag === 'i') tag = 'em';
    if (!ARCHIVE_HTML_TAGS.has(tag)) return '';
    if (tag === 'br') return '<br>';
    if (tag === 'hr') return '<hr>';
    if (slash) return `</${tag}>`;
    if (tag === 'a') {
      const hrefMatch = /href\s*=\s*(["'])(.*?)\1/i.exec(attrs);
      const href = hrefMatch?.[2] ?? '';
      if (!isSafeHref(href)) return '';
      return `<a href="${escapeAttr(href)}">`;
    }
    return `<${tag}>`;
  });
  out = out.replace(/<p>\s*<\/p>/gi, '');
  out = out.replace(/<a>([\s\S]*?)<\/a>/gi, '$1');
  return out.trim();
}

const markdownIt = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: false,
  typographer: false,
});

markdownIt.disable(['code', 'fence', 'image', 'strikethrough']);
markdownIt.validateLink = (url) => isSafeHref(url);

export function archiveMarkdownToHtml(markdown: string): string {
  const src = nfc(normalizeArchiveHorizontalRules((markdown ?? '').replace(CONTROL_CHARS, '')));
  if (!src) return '';
  return sanitizeArchiveHtml(markdownIt.render(src));
}

/** NFC + HR canonical form on already-Markdown (or legacy HTML) text. */
export function normalizeArchiveMarkdown(stored: string): string {
  const raw = (stored ?? '').replace(CONTROL_CHARS, '');
  if (!raw.trim()) return '';
  if (looksLikeStoredHtml(raw)) {
    return htmlToArchiveMarkdown(raw);
  }
  return nfc(normalizeArchiveHorizontalRules(raw.trim()));
}

export function storedToArchiveMarkdown(stored: string): string {
  return normalizeArchiveMarkdown(stored);
}

export function storedToSafeHtml(stored: string): string {
  return archiveMarkdownToHtml(storedToArchiveMarkdown(stored));
}

/**
 * Round-trip helper for tests and editor boundary: Markdown → HTML → Markdown.
 * Must be stable for every admitted construct and for escaped plain text.
 */
export function roundTripArchiveMarkdown(markdown: string): string {
  return htmlToArchiveMarkdown(archiveMarkdownToHtml(markdown));
}

/** Extract visible plain text from a single HTML paragraph for identity checks. */
export function htmlParagraphPlainText(html: string): string {
  const root = parse(html, { comment: false });
  const walk = (nodes: Node[]): string => {
    let out = '';
    for (const node of nodes) {
      if (node.nodeType === NodeType.TEXT_NODE) {
        out += node.text.replace(/\u00a0/g, ' ');
        continue;
      }
      if (!isElement(node)) continue;
      const tag = tagName(node);
      if (tag === 'br') {
        out += '\n';
        continue;
      }
      out += walk(node.childNodes);
    }
    return out;
  };
  return walk(root.childNodes);
}

export function storedToPlainText(stored: string): string {
  const raw = stored ?? '';
  if (!raw.trim()) return '';
  const html = storedToSafeHtml(raw);
  // Empty HTML (e.g. <p style="…"></p>) must not fall back to the raw markup.
  if (!html) {
    return looksLikeStoredHtml(raw) ? '' : nfc(raw.trim());
  }
  return html
    .replace(/<hr\s*\/?>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-3]>/gi, '\n\n')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
