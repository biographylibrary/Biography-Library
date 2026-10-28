import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx';
import { parse, NodeType, type HTMLElement, type Node } from 'node-html-parser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { storedToPlainText, storedToSafeHtml } from '@/lib/archive-markdown';

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
  return storedToPlainText(html ?? '');
}

const DOCX_FONT = 'Times New Roman';
const DOCX_SIZE = 24;
const DOCX_ORDERED = 'bl-ordered';
const DOCX_LEVELS = 5;
let docxListInstance = 0;

/** Numerazione degli elenchi numerati: ogni elenco riparte da 1 (un `instance` per elenco). */
export const DOCX_NUMBERING = {
  config: [
    {
      reference: DOCX_ORDERED,
      levels: Array.from({ length: DOCX_LEVELS }, (_, level) => ({
        level,
        format: LevelFormat.DECIMAL,
        text: `%${level + 1}.`,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
      })),
    },
  ],
};

function newDocument(children: Paragraph[]): Document {
  // L'allineamento a sinistra è scritto nel documento: senza, il corpo dipende da come il programma
  // che lo apre tratta uno stile «Normale» assente. Solo la copertina è centrata, per scelta esplicita.
  return new Document({
    numbering: DOCX_NUMBERING,
    styles: { default: { document: { paragraph: { alignment: AlignmentType.LEFT } } } },
    sections: [{ properties: {}, children }],
  });
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}

function tagOf(el: HTMLElement): string {
  return (el.rawTagName || el.tagName || '').toLowerCase();
}

/** Parti di testo in linea, con grassetto, corsivo e a capo forzati (`<br>` → vero a capo di Word). */
function docxRuns(nodes: Node[], bold = false, italic = false): TextRun[] {
  const out: TextRun[] = [];
  nodes.forEach((node, index) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      let text = node.text.replace(/ /g, ' ');
      const previous = nodes[index - 1];
      // markdown-it scrive `<br>` seguito da un a capo letterale: è lo stesso a capo.
      if (previous && isElement(previous) && tagOf(previous) === 'br') text = text.replace(/^\n+/, '');
      text = text.replace(/\n+/g, ' ');
      if (text) out.push(new TextRun({ text, bold, italics: italic, font: DOCX_FONT, size: DOCX_SIZE }));
      return;
    }
    if (!isElement(node)) return;
    const tag = tagOf(node);
    if (tag === 'br') out.push(new TextRun({ break: 1 }));
    else if (tag === 'strong' || tag === 'b') out.push(...docxRuns(node.childNodes, true, italic));
    else if (tag === 'em' || tag === 'i') out.push(...docxRuns(node.childNodes, bold, true));
    else if (tag === 'script' || tag === 'style') return;
    else out.push(...docxRuns(node.childNodes, bold, italic));
  });
  return out;
}

const HEADING_LEVELS = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
} as const;

function hasText(runs: TextRun[]): boolean {
  return runs.length > 0;
}

/** Una lista, voce per voce: elenco puntato o numerato, con sotto-elenchi e paragrafi di continuazione. */
function docxList(list: HTMLElement, depth: number): Paragraph[] {
  const ordered = tagOf(list) === 'ol';
  const instance = ordered ? ++docxListInstance : 0;
  const level = Math.min(depth, DOCX_LEVELS - 1);
  const out: Paragraph[] = [];
  for (const li of list.childNodes) {
    if (!isElement(li) || tagOf(li) !== 'li') continue;
    let first = true;
    let loose: Node[] = [];
    const flush = () => {
      const runs = docxRuns(loose);
      loose = [];
      if (!hasText(runs)) return;
      out.push(
        first
          ? new Paragraph(
              ordered
                ? { numbering: { reference: DOCX_ORDERED, level, instance }, children: runs }
                : { bullet: { level }, children: runs }
            )
          : new Paragraph({ indent: { left: 720 * (level + 1) }, children: runs })
      );
      first = false;
    };
    for (const child of li.childNodes) {
      if (isElement(child) && (tagOf(child) === 'ul' || tagOf(child) === 'ol')) {
        flush();
        out.push(...docxList(child, depth + 1));
      } else if (isElement(child) && tagOf(child) === 'p') {
        flush();
        loose = [...child.childNodes];
        flush();
      } else {
        loose.push(child);
      }
    }
    flush();
  }
  return out;
}

function docxBlocks(nodes: Node[]): Paragraph[] {
  const out: Paragraph[] = [];
  const spacer = () => out.push(new Paragraph({ text: '' }));
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const runs = docxRuns([node]);
      if (node.text.trim() && hasText(runs)) {
        out.push(new Paragraph({ children: runs }));
        spacer();
      }
      continue;
    }
    if (!isElement(node)) continue;
    const tag = tagOf(node);
    if (tag === 'script' || tag === 'style') continue;
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const runs = docxRuns(node.childNodes, true);
      if (hasText(runs)) out.push(new Paragraph({ heading: HEADING_LEVELS[tag], children: runs }));
    } else if (tag === 'p') {
      const runs = docxRuns(node.childNodes);
      if (hasText(runs)) {
        out.push(new Paragraph({ children: runs }));
        spacer();
      }
    } else if (tag === 'ul' || tag === 'ol') {
      out.push(...docxList(node, 0));
      spacer();
    } else if (tag === 'blockquote') {
      for (const quoted of docxBlocks(node.childNodes)) out.push(quoted);
    } else if (tag === 'hr') {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '* * *', font: DOCX_FONT, size: DOCX_SIZE })],
        })
      );
      spacer();
    } else {
      out.push(...docxBlocks(node.childNodes));
    }
  }
  return out;
}

function buildDocxParagraphsFromHtml(html: string): Paragraph[] {
  return docxBlocks(parse(storedToSafeHtml(html), { comment: false }).childNodes);
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
    const doc = newDocument(children);
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
      const doc = newDocument(children);
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

    const doc = newDocument(children);
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

  const doc = newDocument(children);
  return Packer.toBuffer(doc);
}
