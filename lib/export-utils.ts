import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BIOGRAPHY_SECTIONS } from './editor-constants';

interface BiographyData {
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  created_at: string;
}

interface ExportSection {
  key: string;
  title: string;
  content: string;
}

function stripHtmlTags(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export async function exportAsPlainText(
  biography: BiographyData,
  sections: ExportSection[],
  separateFiles: boolean
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const baseFileName = `${biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${date}`;

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
    let content = [
      `${biography.title}`,
      `By ${biography.author_name}`,
      `Created: ${new Date(biography.created_at).toLocaleDateString()}`,
      '',
      '='.repeat(80),
      '',
    ].join('\n');

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

  const escapeRTF = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}');
  };

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

  const createDocument = (title: string, content: string, isComplete: boolean = false): Document => {
    const children: Paragraph[] = [];

    if (isComplete) {
      children.push(
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
        new Paragraph({ text: '' })
      );
    }

    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ text: '' })
    );

    const plainText = stripHtmlTags(content);
    const paragraphs = plainText.split('\n\n');

    paragraphs.forEach((para) => {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                font: 'Times New Roman',
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' })
        );
      }
    });

    return new Document({
      sections: [{
        properties: {},
        children,
      }],
    });
  };

  if (separateFiles) {
    const zip = new JSZip();
    const { Packer } = await import('docx');

    for (const section of sections) {
      const doc = createDocument(section.title, section.content);
      const blob = await Packer.toBlob(doc);
      const fileName = `${section.key}.docx`;
      zip.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseFileName}_sezioni.zip`);
  } else {
    const { Packer } = await import('docx');
    const children: Paragraph[] = [];

    children.push(
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
      new Paragraph({ text: '' })
    );

    sections.forEach((section) => {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: '' })
      );

      const plainText = stripHtmlTags(section.content);
      const paragraphs = plainText.split('\n\n');

      paragraphs.forEach((para) => {
        if (para.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: para.trim(),
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ text: '' })
          );
        }
      });

      children.push(new Paragraph({ text: '' }));
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${baseFileName}.docx`);
  }
}
