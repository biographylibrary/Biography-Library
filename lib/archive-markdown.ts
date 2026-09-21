/**
 * Original conservato: CommonMark + GFM ristretto a titoli, grassetto, corsivo,
 * liste, citazioni, collegamenti. NFC in scrittura. Il resto (sottolineatura,
 * allineamento, apice, pedice, codice, tabelle, HTML grezzo) non entra.
 */
import MarkdownIt from 'markdown-it';
import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';
import { nfc } from '@/lib/nfc';

const HTML_MARKERS =
  /<(?:p|br|div|span|strong|b|em|i|u|s|ul|ol|li|h[1-6]|blockquote|table|a|sup|sub|hr|pre|code)\b/i;

const ARCHIVE_HTML_TAGS = new Set([
  'p',
  'br',
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

function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(href.trim());
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function escapeInlineMd(text: string): string {
  return decodeEntities(text).replace(/([\\*_[\]])/g, '\\$1');
}

export function looksLikeStoredHtml(text: string): boolean {
  return HTML_MARKERS.test((text ?? '').trim());
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagName(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

function serializeInline(nodes: Node[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      out += escapeInlineMd(node.text);
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagName(node);
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (tag === 'br') {
      out += '  \n';
      continue;
    }
    const inner = serializeInline(node.childNodes);
    if (tag === 'strong' || tag === 'b') {
      if (inner) out += `**${inner}**`;
      continue;
    }
    if (tag === 'em' || tag === 'i') {
      if (inner) out += `*${inner}*`;
      continue;
    }
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
      if (t) parts.push(escapeInlineMd(t));
      continue;
    }
    if (!isElement(node)) continue;

    const tag = tagName(node);
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (tag === 'br' || tag === 'hr') continue;

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
      const text = serializeInline(node.childNodes).trim();
      if (text) parts.push(text);
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
        const head = serializeInline(headNodes).trim();
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
      const text = serializeInline(node.childNodes).trim();
      if (text) parts.push(`${listIndent}- ${text}`);
      continue;
    }

    const inner = serializeBlocks(node.childNodes, listIndent).trim();
    if (inner) parts.push(inner);
  }

  return parts.join('\n\n');
}

export function htmlToArchiveMarkdown(html: string): string {
  const raw = (html ?? '').replace(CONTROL_CHARS, '').trim();
  if (!raw) return '';
  const root = parse(raw, { comment: false });
  const md = serializeBlocks(root.childNodes)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return nfc(md);
}

function sanitizeArchiveHtml(html: string): string {
  let out = html.replace(CONTROL_CHARS, '');
  out = out.replace(/<(\/?)([\w]+)([^>]*)>/gi, (_m, slash: string, rawTag: string, attrs: string) => {
    let tag = rawTag.toLowerCase();
    if (tag === 'b') tag = 'strong';
    if (tag === 'i') tag = 'em';
    if (!ARCHIVE_HTML_TAGS.has(tag)) return '';
    if (tag === 'br') return '<br>';
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
  linkify: true,
  typographer: false,
});

markdownIt.disable(['code', 'fence', 'hr', 'image', 'strikethrough']);
markdownIt.validateLink = (url) => isSafeHref(url);

export function archiveMarkdownToHtml(markdown: string): string {
  const src = nfc((markdown ?? '').replace(CONTROL_CHARS, '').trim());
  if (!src) return '';
  return sanitizeArchiveHtml(markdownIt.render(src));
}

export function storedToArchiveMarkdown(stored: string): string {
  const raw = (stored ?? '').replace(CONTROL_CHARS, '');
  if (!raw.trim()) return '';
  if (looksLikeStoredHtml(raw)) {
    return htmlToArchiveMarkdown(raw);
  }
  return nfc(raw.trim());
}

export function storedToSafeHtml(stored: string): string {
  return archiveMarkdownToHtml(storedToArchiveMarkdown(stored));
}

export function storedToPlainText(stored: string): string {
  const html = storedToSafeHtml(stored);
  if (!html) {
    return nfc((stored ?? '').trim());
  }
  return html
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
