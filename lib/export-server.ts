import {
  extractSemanticBlocks,
  parseHtmlIntoRuns,
  stripHtmlToPlain,
  type InlineRun,
} from '@/lib/import/html-blocks';

const FONT_BODY = 'Noto Serif';
/** docx `size` is half-points */
const SZ_BODY = 22; // 11pt
const SZ_H1 = 36; // 18pt
const SZ_H2 = 30; // 15pt
const SZ_H3 = 26; // 13pt

function stripHtmlServer(html: string): string {
  return stripHtmlToPlain(html);
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

function extractSemanticBlocksLocal(html: string): Array<{ tag: SemanticTag; inner: string }> {
  return extractSemanticBlocks(html)
    .filter((b): b is { tag: SemanticTag; inner: string } =>
      b.tag === 'p' || b.tag === 'h1' || b.tag === 'h2' || b.tag === 'h3'
    );
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
    const blocks = extractSemanticBlocksLocal(html);
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
