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

type InlineMark = { open: string; close: string; inner: string };
type InlinePiece = string | InlineMark;

const TOKEN_FIRST = /^(?:\\[\s\S]|&[a-z#0-9]+;|[\s\S])/u;
const TOKEN_LAST = /(?:\\[\s\S]|&[a-z#0-9]+;|[\s\S])$/u;

function isSpaceChar(ch: string): boolean {
  return ch === '' || /\s/u.test(ch);
}

/** Punteggiatura nel senso di CommonMark (categorie P e S), compresi i caratteri già «escapati». */
function isPunctToken(token: string): boolean {
  if (token.startsWith('\\') || token.startsWith('&')) return true;
  return /[\p{P}\p{S}]/u.test(token);
}

/**
 * Chiude i segni di grassetto e corsivo guardando i caratteri accanto. Per CommonMark un `**` si
 * apre o si chiude solo se non ha uno spazio dalla parte del testo e, quando ha una
 * punteggiatura dalla parte del testo, ha uno spazio o una punteggiatura dall'altra. Altrimenti
 * i due asterischi restano nel testo alla rilettura: `**con **altre`, `N**.1 …**`, `*…😀*nonna`.
 * Si sistema lasciando fuori dai segni gli spazi e la punteggiatura di bordo, che perdono il
 * grassetto ma non cambiano parola.
 */
function resolveInlinePieces(pieces: InlinePiece[]): string {
  let out = '';
  pieces.forEach((piece, index) => {
    if (typeof piece === 'string') {
      out += piece;
      return;
    }
    const plain = piece.open === piece.close && piece.open.startsWith('*');
    let lead = '';
    let trail = '';
    let core = piece.inner;
    const trim = () => {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(core);
      if (!m) return;
      lead += m[1];
      trail = m[3] + trail;
      core = m[2];
    };
    trim();
    // Subito dopo un a capo forzato gli spazi iniziali non contano per Markdown.
    if (/(?: {2}|\\)\n$/.test(out)) lead = lead.replace(/^[ \t]+/, '');
    if (plain) {
      const following = pieces[index + 1];
      for (let guard = 0; guard < 8 && core; guard++) {
        const before = lead ? lead[lead.length - 1] : (out[out.length - 1] ?? '');
        const first = TOKEN_FIRST.exec(core)?.[0] ?? '';
        if (first && isPunctToken(first) && !isSpaceChar(before) && !isPunctToken(before)) {
          lead += first;
          core = core.slice(first.length);
          trim();
          continue;
        }
        const after = trail
          ? trail[0]
          : typeof following === 'string'
            ? (following[0] ?? '')
            : following
              ? '*'
              : '';
        const last = TOKEN_LAST.exec(core)?.[0] ?? '';
        if (last && isPunctToken(last) && !isSpaceChar(after) && !isPunctToken(after)) {
          trail = last + trail;
          core = core.slice(0, core.length - last.length);
          trim();
          continue;
        }
        break;
      }
    }
    if (!core) {
      out += lead + trail;
      return;
    }
    let { open, close } = piece;
    if (open === '**_' || open === '_**') {
      // Grassetto e corsivo insieme: accanto a un altro segno `*` si scrive col corsivo fuori
      // (`_**x**_`), così gli asterischi dei due segni non si fondono in una sola serie.
      const before = lead ? lead[lead.length - 1] : (out[out.length - 1] ?? '');
      const following = pieces[index + 1];
      const after = trail
        ? trail[0]
        : typeof following === 'string'
          ? (following[0] ?? '')
          : following
            ? '*'
            : '';
      if (before === '*' || after === '*') {
        open = '_**';
        close = '**_';
      }
    }
    if (open === '*' && close === '*') {
      // Corsivo attaccato a un grassetto (`**a***b*`): le due serie di asterischi si fonderebbero.
      // Col trattino basso restano distinte, se dai due lati non c'è una lettera attaccata.
      const before = lead ? lead[lead.length - 1] : (out[out.length - 1] ?? '');
      const following = pieces[index + 1];
      const after = trail
        ? trail[0]
        : typeof following === 'string'
          ? (following[0] ?? '')
          : following
            ? '*'
            : '';
      const edgeOk = (ch: string) => isSpaceChar(ch) || isPunctToken(ch);
      if ((before === '*' || after === '*') && edgeOk(before) && edgeOk(after)) {
        open = '_';
        close = '_';
      }
    }
    out += `${lead}${open}${core}${close}${trail}`;
  });
  return out;
}

/** Il primo figlio è un elemento di questo tipo (grassetto o corsivo)? */
function markKind(node: Node | undefined): 'strong' | 'em' | null {
  if (!node || !isElement(node)) return null;
  const tag = tagName(node);
  if (tag === 'strong' || tag === 'b') return 'strong';
  if (tag === 'em' || tag === 'i') return 'em';
  return null;
}

/**
 * Corsivo che attraversa una parola in grassetto (o il contrario): l'editor lo conserva come
 * <em>a</em><strong><em>b</em></strong><em>c</em>, e scritto così `*a***_b_***c*` non si legge più.
 * Si scrive annidato: `*a **b** c*`. Restituisce quanti nodi ha consumato, 0 se non è il caso.
 */
function mergeNestedMarks(nodes: Node[], i: number, pieces: InlinePiece[]): number {
  const kind = markKind(nodes[i]);
  if (!kind) return 0;
  const other = kind === 'strong' ? 'em' : 'strong';
  const wrapper = (node: Node | undefined) => {
    if (markKind(node) !== other) return null;
    const only = onlyElementChild((node as HTMLElement).childNodes);
    return only && markKind(only) === kind ? only : null;
  };
  const marker = (k: 'strong' | 'em') => (k === 'strong' ? '**' : '*');
  const parts: InlinePiece[] = [serializeInline((nodes[i] as HTMLElement).childNodes)];
  let j = i;
  while (wrapper(nodes[j + 1]) && markKind(nodes[j + 2]) === kind) {
    const core = wrapper(nodes[j + 1])!;
    parts.push({ open: marker(other), close: marker(other), inner: serializeInline(core.childNodes) });
    parts.push(serializeInline((nodes[j + 2] as HTMLElement).childNodes));
    j += 2;
  }
  if (j === i) return 0;
  const inner = resolveInlinePieces(parts);
  if (inner.trim()) pieces.push({ open: marker(kind), close: marker(kind), inner });
  return j - i + 1;
}

function serializeInline(nodes: Node[]): string {
  const pieces: InlinePiece[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === NodeType.TEXT_NODE) {
      let text = node.text;
      // markdown-it emits a newline text node after <br>; keep a single hard break.
      const last = pieces[pieces.length - 1];
      if (
        typeof last === 'string' &&
        (last.endsWith('  \n') || last.endsWith('\\\n')) &&
        text.startsWith('\n')
      ) {
        text = text.slice(1);
      }
      // Dopo un a capo forzato gli spazi iniziali della riga dopo non contano per Markdown.
      if (typeof last === 'string' && (last.endsWith('  \n') || last.endsWith('\\\n'))) {
        text = text.replace(/^[ \t]+/, '');
      }
      if (text) pieces.push(escapeInlineMd(text));
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagName(node);
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (tag === 'br') {
      // Due a capo di fila: `  \n  \n` per CommonMark è una riga vuota e spezza il paragrafo.
      // Il secondo si scrive con la barra rovesciata, che resta un a capo forzato.
      const last = pieces[pieces.length - 1];
      const afterBreak = typeof last === 'string' && (last.endsWith('  \n') || last.endsWith('\\\n'));
      pieces.push(afterBreak ? '\\\n' : '  \n');
      continue;
    }
    const consumed = mergeNestedMarks(nodes, i, pieces);
    if (consumed) {
      i += consumed - 1;
      continue;
    }
    // Bold+italic as **_…_** / _**…**_ — never ***…*** (ambiguous with scene breaks).
    if (tag === 'strong' || tag === 'b') {
      const only = onlyElementChild(node.childNodes);
      if (only && (tagName(only) === 'em' || tagName(only) === 'i')) {
        const inner = serializeInline(only.childNodes);
        if (inner) pieces.push({ open: '**_', close: '_**', inner });
        continue;
      }
      const inner = serializeInline(node.childNodes);
      if (inner) pieces.push({ open: '**', close: '**', inner });
      continue;
    }
    if (tag === 'em' || tag === 'i') {
      const only = onlyElementChild(node.childNodes);
      if (only && (tagName(only) === 'strong' || tagName(only) === 'b')) {
        const inner = serializeInline(only.childNodes);
        if (inner) pieces.push({ open: '_**', close: '**_', inner });
        continue;
      }
      const inner = serializeInline(node.childNodes);
      if (inner) pieces.push({ open: '*', close: '*', inner });
      continue;
    }
    const inner = serializeInline(node.childNodes);
    if (tag === 'a') {
      const href = (node.getAttribute('href') ?? '').trim();
      if (inner && isSafeHref(href)) {
        pieces.push(`[${inner.replace(/\]/g, '\\]')}](${href})`);
      } else {
        pieces.push(inner);
      }
      continue;
    }
    pieces.push(inner);
  }
  return resolveInlinePieces(pieces);
}

type ListItemBlock =
  | { kind: 'paragraph'; nodes: Node[] }
  | { kind: 'list'; el: HTMLElement };

/**
 * List-item children in document order: each <p> (or loose inline run) and each
 * nested ul/ol stay where they are (a paragraph after a nest is not pulled up).
 */
function listItemBlocks(li: HTMLElement): ListItemBlock[] {
  const blocks: ListItemBlock[] = [];
  let looseInline: Node[] = [];

  const flushLoose = () => {
    if (looseInline.length) {
      blocks.push({ kind: 'paragraph', nodes: looseInline });
      looseInline = [];
    }
  };

  for (const child of li.childNodes) {
    if (isElement(child) && (tagName(child) === 'ul' || tagName(child) === 'ol')) {
      flushLoose();
      blocks.push({ kind: 'list', el: child });
      continue;
    }
    if (isElement(child) && tagName(child) === 'p') {
      flushLoose();
      blocks.push({ kind: 'paragraph', nodes: [...child.childNodes] });
      continue;
    }
    if (
      child.nodeType === NodeType.TEXT_NODE &&
      !(child.text ?? '').replace(/\u00a0/g, ' ').trim() &&
      // Lo spazio tra due parole formattate (`**a** *b*`) è testo: si toglie solo a inizio blocco.
      looseInline.length === 0
    ) {
      continue;
    }
    looseInline.push(child);
  }
  flushLoose();
  return blocks;
}

/** Serialize one list-item paragraph (inline + block-start escape), like a normal <p>. */
function serializeListItemParagraph(nodes: Node[]): string {
  const text = stripEdgeBreaks(serializeInline(nodes));
  const normalized = text
    .replace(/[ \t]+\n/g, '  \n')
    .replace(/[ \t]+$/g, (m) => (m.length >= 2 ? '  ' : ''));
  const body = normalized.trim();
  if (!body) return '';
  return finalizeParagraphMd(body);
}

/** Nested list whose first line is only a marker would setext-underline the parent head. */
function nestedListStartsWithEmptyMarker(nestedMd: string): boolean {
  const firstLine = nestedMd.split('\n')[0] ?? '';
  return /^[ \t]*(?:[-*+]|\d+\.)[ \t]*$/.test(firstLine);
}

/**
 * One list item → Markdown lines. Empty items still emit the marker (as on main).
 * Continuation paragraphs and nested lists keep document order.
 */
function serializeListItemLines(
  li: HTMLElement,
  listIndent: string,
  marker: string
): string[] {
  const markerIndent = ' '.repeat(marker.length);
  const childListIndent = `${listIndent}${markerIndent}`;
  const blocks = listItemBlocks(li);
  const lines: string[] = [];
  let markerEmitted = false;
  let headParagraphDone = false;

  const emitMarker = (head: string) => {
    lines.push(`${listIndent}${marker}${head}`);
    markerEmitted = true;
    headParagraphDone = true;
  };

  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      const md = serializeListItemParagraph(block.nodes);
      if (!headParagraphDone) {
        emitMarker(md);
        continue;
      }
      if (!md) continue;
      lines.push('');
      for (const line of md.split('\n')) {
        lines.push(`${childListIndent}${line}`);
      }
      continue;
    }

    if (!markerEmitted) emitMarker('');
    const nestedMd = serializeBlocks([block.el], childListIndent).trimEnd();
    if (!nestedMd) continue;
    const prev = lines[lines.length - 1] ?? '';
    const prevIsBareMarker = prev.trim() === marker.trim();
    if (nestedListStartsWithEmptyMarker(nestedMd) && prev !== '' && !prevIsBareMarker) {
      lines.push('');
    }
    lines.push(nestedMd);
  }

  if (!markerEmitted) {
    lines.push(`${listIndent}${marker}`);
  }
  return lines;
}

/** Gli a capo forzati all'inizio o alla fine di un paragrafo non si salvano: Markdown li perde, e la barra rovesciata resterebbe come lettera. */
function stripEdgeBreaks(text: string): string {
  return text.replace(/^(?:\\\n|[ \t]*\n)+/, '').replace(/(?:\\\n|[ \t]*\n)+[ \t]*$/, '');
}

/** Un titolo sta su una riga sola: un a capo forzato (Maiusc+Invio) diventa uno spazio. */
function serializeHeadingInline(nodes: Node[]): string {
  return serializeInline(nodes)
    .replace(/\\\n/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .trim();
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
      const text = serializeHeadingInline(node.childNodes);
      if (text) parts.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
      continue;
    }
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = serializeHeadingInline(node.childNodes);
      if (text) parts.push(`### ${text}`);
      continue;
    }
    if (tag === 'p' || tag === 'div') {
      const text = stripEdgeBreaks(serializeInline(node.childNodes)).replace(/^[ \t]+/, '');
      // Keep hard-break markers (`  \n`); drop other trailing spaces.
      const normalized = text.replace(/[ \t]+\n/g, '  \n').replace(/[ \t]+$/g, '');
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
        lines.push(...serializeListItemLines(li, listIndent, marker));
      });
      if (lines.length) parts.push(lines.join('\n'));
      continue;
    }
    if (tag === 'li') {
      const itemMd = serializeListItemLines(node, listIndent, '- ').join('\n');
      if (itemMd) parts.push(itemMd);
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
    // `<br>` seguito dal suo a capo letterale (come lo scrive markdown-it) è un a capo solo.
    .replace(/<br\s*\/?>[ \t]*\r?\n?/gi, '\n')
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
