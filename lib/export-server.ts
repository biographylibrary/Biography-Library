import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

function stripHtmlServer(html: string): string {
  return html
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseHtmlIntoRuns(html: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let pos = 0;
  let bold = false;
  let italic = false;

  const tagRe = /<(\/?)(\w+)[^>]*>/gi;
  let match: RegExpExecArray | null;
  tagRe.lastIndex = 0;

  while ((match = tagRe.exec(html)) !== null) {
    const before = html.slice(pos, match.index);
    if (before) {
      const text = before
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      if (text) runs.push({ text, bold, italic });
    }
    pos = match.index + match[0].length;
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (tag === 'strong' || tag === 'b') bold = !closing;
    else if (tag === 'em' || tag === 'i') italic = !closing;
  }

  const remaining = html.slice(pos);
  if (remaining) {
    const text = remaining
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (text.trim()) runs.push({ text, bold, italic });
  }

  return runs.filter((r) => r.text.trim() !== '' || r.text === ' ');
}

function htmlToParagraphRuns(html: string): InlineRun[][] {
  const normalized = html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  return normalized
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseHtmlIntoRuns(part))
    .filter((runs) => runs.length > 0);
}

function buildDocxParagraphsFromHtml(html: string): Paragraph[] {
  const result: Paragraph[] = [];
  for (const runs of htmlToParagraphRuns(html)) {
    result.push(
      new Paragraph({
        children: runs.map(
          (r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italic, font: 'Times New Roman', size: 24 })
        ),
      })
    );
    result.push(new Paragraph({ text: '' }));
  }
  return result;
}

export function buildBiographyTxtContent(
  title: string,
  authorName: string,
  createdAt: string,
  sections: Array<{ title: string; content: string }>
): string {
  const header = [
    title,
    `By ${authorName}`,
    `Created: ${new Date(createdAt).toLocaleDateString('en-GB')}`,
    '',
    '='.repeat(80),
    '',
  ].join('\n');

  let content = header;
  sections.forEach((section) => {
    content += `\n\n=== ${section.title.toUpperCase()} ===\n\n`;
    content += stripHtmlServer(section.content);
  });

  return content;
}

export async function buildBiographyDocxBuffer(
  title: string,
  authorName: string,
  createdAt: string,
  sections: Array<{ title: string; content: string }>
): Promise<Buffer> {
  const { Packer } = await import('docx');

  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `By ${authorName}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: new Date(createdAt).toLocaleDateString('en-GB'), alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: '' }),
  ];

  sections.forEach((section) => {
    children.push(
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '' }),
      ...buildDocxParagraphsFromHtml(section.content),
      new Paragraph({ text: '' })
    );
  });

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
