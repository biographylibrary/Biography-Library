import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface BiographyData {
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  created_at: string;
}

interface ExportSection {
  key: string;
  title: string;
  content: string;
}

export function stripHtmlTags(html: string): string {
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

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
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
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (text) runs.push({ text, bold, italic });
    }
    pos = match.index + match[0].length;

    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'strong' || tag === 'b') {
      bold = !closing;
    } else if (tag === 'em' || tag === 'i') {
      italic = !closing;
    }
  }

  const remaining = html.slice(pos);
  if (remaining) {
    const text = remaining
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    if (text.trim()) runs.push({ text, bold, italic });
  }

  return runs.filter((r) => r.text.trim() !== '' || r.text === ' ');
}

function htmlToParagraphs(html: string): InlineRun[][] {
  const paragraphs: InlineRun[][] = [];

  const normalized = html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const parts = normalized.split(/\n\n+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const runs = parseHtmlIntoRuns(trimmed);
    if (runs.length > 0) paragraphs.push(runs);
  }

  return paragraphs;
}

function buildDocxParagraphsFromHtml(html: string): Paragraph[] {
  const paragraphRuns = htmlToParagraphs(html);
  const result: Paragraph[] = [];

  for (const runs of paragraphRuns) {
    result.push(
      new Paragraph({
        children: runs.map(
          (r) =>
            new TextRun({
              text: r.text,
              bold: r.bold,
              italics: r.italic,
              font: 'Times New Roman',
              size: 24,
            })
        ),
      })
    );
    result.push(new Paragraph({ text: '' }));
  }

  return result;
}

function buildHeader(biography: BiographyData): string[] {
  return [
    `${biography.title}`,
    `By ${biography.author_name}`,
    `Created: ${new Date(biography.created_at).toLocaleDateString()}`,
    '',
    '='.repeat(80),
    '',
  ];
}

export async function exportAsPlainText(
  biography: BiographyData,
  sections: ExportSection[],
  separateFiles: boolean
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const baseFileName = `${biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${date}`;
  const isFreeFlow = biography.biography_mode === 'freeflow';

  if (isFreeFlow) {
    const content = [
      ...buildHeader(biography),
      stripHtmlTags(biography.content_freeflow || ''),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${baseFileName}.txt`);
    return;
  }

  if (separateFiles) {
    const zip = new JSZip();

    sections.forEach((section) => {
      const content = [
        `=== ${section.title.toUpperCase()} ===`,
        '',
        stripHtmlTags(section.content),
        '',
        '',
        `<!-- BIOGRAPHY_LIBRARY_METADATA`,
        `section: ${section.key}`,
        `biography_id: ${biography.title}`,
        `exported_at: ${new Date().toISOString()}`,
        `-->`,
      ].join('\n');

      const fileName = `${section.key}.txt`;
      zip.file(fileName, content);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseFileName}_sezioni.zip`);
  } else {
    let content = buildHeader(biography).join('\n');

    sections.forEach((section) => {
      content += `\n\n=== ${section.title.toUpperCase()} ===\n\n`;
      content += stripHtmlTags(section.content);
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${baseFileName}.txt`);
  }
}

export async function exportAsRTF(
  biography: BiographyData,
  sections: ExportSection[],
  separateFiles: boolean
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const baseFileName = `${biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${date}`;
  const isFreeFlow = biography.biography_mode === 'freeflow';

  const escapeRTF = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}');
  };

  const generateRTF = (title: string, content: string, isComplete: boolean = false): string => {
    let rtf = '{\\rtf1\\ansi\\deff0\n';
    rtf += '{\\fonttbl{\\f0 Times New Roman;}}\n';

    if (isComplete) {
      rtf += '{\\header\\pard\\qc\\fs24\\b ' + escapeRTF(biography.title) + '\\par}\n';
      rtf += '\\pard\\qc\\fs32\\b ' + escapeRTF(biography.title) + '\\par\n';
      rtf += '\\pard\\qc\\fs20 By ' + escapeRTF(biography.author_name) + '\\par\n';
      rtf += '\\pard\\qc\\fs16 ' + new Date(biography.created_at).toLocaleDateString() + '\\par\n';
      rtf += '\\pard\\par\\par\n';
    }

    rtf += '\\pard\\fs28\\b ' + escapeRTF(title) + '\\par\n';
    rtf += '\\pard\\par\n';

    const plainText = stripHtmlTags(content);
    const paragraphs = plainText.split('\n\n');

    paragraphs.forEach((para) => {
      if (para.trim()) {
        rtf += '\\pard\\fs24 ' + escapeRTF(para.trim()) + '\\par\n';
        rtf += '\\pard\\par\n';
      }
    });

    rtf += '}';
    return rtf;
  };

  if (isFreeFlow) {
    let fullRTF = '{\\rtf1\\ansi\\deff0\n';
    fullRTF += '{\\fonttbl{\\f0 Times New Roman;}}\n';
    fullRTF += '\\pard\\qc\\fs32\\b ' + escapeRTF(biography.title) + '\\par\n';
    fullRTF += '\\pard\\qc\\fs20 By ' + escapeRTF(biography.author_name) + '\\par\n';
    fullRTF += '\\pard\\qc\\fs16 ' + new Date(biography.created_at).toLocaleDateString() + '\\par\n';
    fullRTF += '\\pard\\par\\par\n';

    const plainText = stripHtmlTags(biography.content_freeflow || '');
    plainText.split('\n\n').forEach((para) => {
      if (para.trim()) {
        fullRTF += '\\pard\\fs24 ' + escapeRTF(para.trim()) + '\\par\n';
        fullRTF += '\\pard\\par\n';
      }
    });

    fullRTF += '}';
    const blob = new Blob([fullRTF], { type: 'application/rtf' });
    saveAs(blob, `${baseFileName}.rtf`);
    return;
  }

  if (separateFiles) {
    const zip = new JSZip();

    sections.forEach((section) => {
      const rtfContent = generateRTF(section.title, section.content);
      const fileName = `${section.key}.rtf`;
      zip.file(fileName, rtfContent);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseFileName}_sezioni.zip`);
  } else {
    let fullRTF = '{\\rtf1\\ansi\\deff0\n';
    fullRTF += '{\\fonttbl{\\f0 Times New Roman;}}\n';
    fullRTF += '\\pard\\qc\\fs32\\b ' + escapeRTF(biography.title) + '\\par\n';
    fullRTF += '\\pard\\qc\\fs20 By ' + escapeRTF(biography.author_name) + '\\par\n';
    fullRTF += '\\pard\\qc\\fs16 ' + new Date(biography.created_at).toLocaleDateString() + '\\par\n';
    fullRTF += '\\pard\\par\\par\n';

    sections.forEach((section) => {
      fullRTF += '\\pard\\fs28\\b ' + escapeRTF(section.title) + '\\par\n';
      fullRTF += '\\pard\\par\n';

      const plainText = stripHtmlTags(section.content);
      const paragraphs = plainText.split('\n\n');

      paragraphs.forEach((para) => {
        if (para.trim()) {
          fullRTF += '\\pard\\fs24 ' + escapeRTF(para.trim()) + '\\par\n';
          fullRTF += '\\pard\\par\n';
        }
      });

      fullRTF += '\\pard\\par\n';
    });

    fullRTF += '}';

    const blob = new Blob([fullRTF], { type: 'application/rtf' });
    saveAs(blob, `${baseFileName}.rtf`);
  }
}

export async function exportAsDOCX(
  biography: BiographyData,
  sections: ExportSection[],
  separateFiles: boolean
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const baseFileName = `${biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${date}`;
  const isFreeFlow = biography.biography_mode === 'freeflow';

  const buildCoverParagraphs = (): Paragraph[] => [
    new Paragraph({
      text: biography.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `By ${biography.author_name}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: new Date(biography.created_at).toLocaleDateString(),
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ text: '' }),
  ];

  if (isFreeFlow) {
    const { Packer } = await import('docx');
    const children: Paragraph[] = [
      ...buildCoverParagraphs(),
      ...buildDocxParagraphsFromHtml(biography.content_freeflow || ''),
    ];
    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${baseFileName}.docx`);
    return;
  }

  if (separateFiles) {
    const zip = new JSZip();
    const { Packer } = await import('docx');

    for (const section of sections) {
      const children: Paragraph[] = [
        new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
        ...buildDocxParagraphsFromHtml(section.content),
      ];
      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      zip.file(`${section.key}.docx`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseFileName}_sezioni.zip`);
  } else {
    const { Packer } = await import('docx');
    const children: Paragraph[] = [...buildCoverParagraphs()];

    sections.forEach((section) => {
      children.push(
        new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
        ...buildDocxParagraphsFromHtml(section.content),
        new Paragraph({ text: '' })
      );
    });

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${baseFileName}.docx`);
  }
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
    `Created: ${new Date(createdAt).toLocaleDateString()}`,
    '',
    '='.repeat(80),
    '',
  ].join('\n');

  let content = header;
  sections.forEach((section) => {
    content += `\n\n=== ${section.title.toUpperCase()} ===\n\n`;
    content += stripHtmlTags(section.content);
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
    new Paragraph({ text: new Date(createdAt).toLocaleDateString(), alignment: AlignmentType.CENTER }),
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
