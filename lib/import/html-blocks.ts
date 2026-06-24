export interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

export type SemanticTag =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ul'
  | 'ol'
  | 'li'
  | 'blockquote'
  | 'table';

export interface SemanticBlock {
  tag: SemanticTag;
  inner: string;
  /** Full outer HTML for tables */
  outerHtml?: string;
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtmlToPlain(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function parseHtmlIntoRuns(html: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let pos = 0;
  let bold = false;
  let italic = false;
  let underline = false;

  const tagRe = /<(\/?)(\w+)[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const before = html.slice(pos, match.index);
    if (before) {
      const text = decodeHtmlEntities(before);
      if (text) runs.push({ text, bold, italic });
    }
    pos = match.index + match[0].length;
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (tag === 'strong' || tag === 'b') bold = !closing;
    else if (tag === 'em' || tag === 'i') italic = !closing;
    else if (tag === 'u') underline = !closing;
    void underline;
  }

  const remaining = html.slice(pos);
  if (remaining) {
    const text = decodeHtmlEntities(remaining);
    if (text.trim()) runs.push({ text, bold, italic });
  }

  return runs.filter((r) => r.text.trim() !== '' || r.text === ' ');
}

export function extractSemanticBlocks(html: string): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  const normalized = html.trim();
  if (!normalized) return blocks;

  const tableRe = /<table\b[\s\S]*?<\/table>/gi;
  let lastIndex = 0;
  let tableMatch: RegExpExecArray | null;

  const pushInlineBlocks = (chunk: string) => {
    if (!chunk.trim()) return;
    const re = /<(p|h1|h2|h3|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    let found = false;
    while ((m = re.exec(chunk)) !== null) {
      found = true;
      blocks.push({
        tag: m[1].toLowerCase() as SemanticTag,
        inner: m[2],
      });
    }
    if (!found && chunk.trim()) {
      blocks.push({ tag: 'p', inner: chunk });
    }
  };

  while ((tableMatch = tableRe.exec(normalized)) !== null) {
    pushInlineBlocks(normalized.slice(lastIndex, tableMatch.index));
    blocks.push({
      tag: 'table',
      inner: tableMatch[0],
      outerHtml: tableMatch[0],
    });
    lastIndex = tableMatch.index + tableMatch[0].length;
  }
  pushInlineBlocks(normalized.slice(lastIndex));

  return blocks;
}

export function appendHtml(existing: string, incoming: string): string {
  if (!existing.trim()) return incoming;
  if (!incoming.trim()) return existing;
  const sep = existing.endsWith('</p>') ? '' : '<p></p>';
  return existing + sep + incoming;
}
