interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

const FONT_BODY = 'Noto Serif';
/** docx `size` is half-points */
const SZ_BODY = 22; // 11pt
const SZ_H1 = 36; // 18pt
const SZ_H2 = 30; // 15pt
const SZ_H3 = 26; // 13pt

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

type SemanticTag = 'p' | 'h1' | 'h2' | 'h3';

function extractSemanticBlocks(html: string): Array<{ tag: SemanticTag; inner: string }> {
  const blocks: Array<{ tag: SemanticTag; inner: string }> = [];
  const re = /<(p|h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    blocks.push({
      tag: m[1].toLowerCase() as SemanticTag,
      inner: m[2],
    });
  }
  return blocks;
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
  const {
    AlignmentType,
    Document,
    LineRuleType,
    PageOrientation,
    Paragraph,
    Packer,
    TextRun,
  } = await import('docx');

  function buildRunsParagraph(runs: InlineRun[]) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 120 },
      children: runs.map(
        (r) =>
          new TextRun({
            text: r.text,
            bold: r.bold,
            italics: r.italic,
            font: FONT_BODY,
            size: SZ_BODY,
          })
      ),
    });
  }

  function buildDocxParagraphsFromHtml(html: string) {
    const blocks = extractSemanticBlocks(html);
    const result: InstanceType<typeof Paragraph>[] = [];

    if (blocks.length > 0) {
      for (const block of blocks) {
        if (block.tag === 'h1') {
          const plain = stripHtmlServer(block.inner);
          if (!plain.trim()) continue;
          result.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 240, after: 120, line: 360, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({ text: plain, bold: true, font: FONT_BODY, size: SZ_H1 }),
              ],
            })
          );
        } else if (block.tag === 'h2') {
          const plain = stripHtmlServer(block.inner);
          if (!plain.trim()) continue;
          result.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 200, after: 100, line: 360, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({ text: plain, bold: true, font: FONT_BODY, size: SZ_H2 }),
              ],
            })
          );
        } else if (block.tag === 'h3') {
          const plain = stripHtmlServer(block.inner);
          if (!plain.trim()) continue;
          result.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 160, after: 80, line: 360, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({ text: plain, bold: true, font: FONT_BODY, size: SZ_H3 }),
              ],
            })
          );
        } else {
          const runsList = parseHtmlIntoRuns(block.inner);
          if (runsList.length === 0) continue;
          result.push(buildRunsParagraph(runsList));
        }
      }
      return result;
    }

    for (const runs of htmlToParagraphRuns(html)) {
      result.push(buildRunsParagraph(runs));
      result.push(new Paragraph({ text: '' }));
    }
    return result;
  }

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 160 },
      children: [new TextRun({ text: title, bold: true, font: FONT_BODY, size: SZ_H1 })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 80 },
      children: [
        new TextRun({
          text: `By ${authorName}`,
          font: FONT_BODY,
          size: SZ_BODY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 240 },
      children: [
        new TextRun({
          text: new Date(createdAt).toLocaleDateString('en-GB'),
          font: FONT_BODY,
          size: SZ_BODY,
        }),
      ],
    }),
  ];

  sections.forEach((section) => {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 160, line: 360, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            font: FONT_BODY,
            size: SZ_H1,
          }),
        ],
      }),
      ...buildDocxParagraphsFromHtml(section.content),
      new Paragraph({ text: '' })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
