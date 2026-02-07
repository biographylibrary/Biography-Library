import * as mammoth from 'mammoth';
import { RTFJS } from 'rtf.js';

export interface ParsedSection {
  title: string;
  content: string;
}

export interface ParsedText {
  content: string;
  sections?: ParsedSection[];
  hasSections: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export class TextImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextImportError';
  }
}

function sanitizeHtml(html: string): string {
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'sup', 'sub'
  ];

  const div = document.createElement('div');
  div.innerHTML = html;

  const removeDisallowedTags = (element: Element) => {
    Array.from(element.children).forEach(child => {
      if (!allowedTags.includes(child.tagName.toLowerCase())) {
        const textNode = document.createTextNode(child.textContent || '');
        child.replaceWith(textNode);
      } else {
        Array.from(child.attributes).forEach(attr => {
          if (!['class', 'style'].includes(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
        });
        removeDisallowedTags(child);
      }
    });
  };

  removeDisallowedTags(div);
  return div.innerHTML;
}

function detectSections(text: string): ParsedSection[] | null {
  const sectionPatterns = [
    /^##\s+(.+)$/gm,
    /^===\s+(.+)\s+===/gm,
    /^---\s+(.+)\s+---/gm,
    /^\*\*\*\s+(.+)\s+\*\*\*/gm,
  ];

  for (const pattern of sectionPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      const sections: ParsedSection[] = [];
      const parts = text.split(pattern);

      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i].trim();
        const content = parts[i + 1]?.trim() || '';
        if (title && content) {
          sections.push({ title, content: convertPlainTextToHtml(content) });
        }
      }

      if (sections.length > 0) {
        return sections;
      }
    }
  }

  return null;
}

function convertPlainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('# ')) {
        return `<h1>${trimmed.substring(2)}</h1>`;
      } else if (trimmed.startsWith('## ')) {
        return `<h2>${trimmed.substring(3)}</h2>`;
      } else if (trimmed.startsWith('### ')) {
        return `<h3>${trimmed.substring(4)}</h3>`;
      }

      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

export async function parseTextFile(file: File): Promise<ParsedText> {
  if (file.size > MAX_FILE_SIZE) {
    throw new TextImportError('File troppo grande. Dimensione massima: 5MB');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'txt':
        return await parseTxtFile(file);

      case 'rtf':
        return await parseRtfFile(file);

      case 'docx':
        return await parseDocxFile(file);

      case 'doc':
        throw new TextImportError('Formato .doc non supportato. Converti il file in .docx o .txt');

      default:
        throw new TextImportError('Formato non supportato. Usa .txt, .rtf o .docx');
    }
  } catch (error) {
    if (error instanceof TextImportError) {
      throw error;
    }
    throw new TextImportError('Errore nella lettura del file');
  }
}

async function parseTxtFile(file: File): Promise<ParsedText> {
  const text = await file.text();
  const sections = detectSections(text);

  if (sections) {
    return {
      content: '',
      sections,
      hasSections: true,
    };
  }

  return {
    content: sanitizeHtml(convertPlainTextToHtml(text)),
    hasSections: false,
  };
}

async function parseRtfFile(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const doc = new RTFJS.Document(arrayBuffer, {});
    const elements = await doc.render();

    let htmlString = '';
    if (Array.isArray(elements)) {
      elements.forEach((el: any) => {
        if (el && typeof el === 'object' && 'outerHTML' in el) {
          htmlString += el.outerHTML;
        } else if (el && typeof el === 'string') {
          htmlString += `<p>${el}</p>`;
        }
      });
    } else if (elements && typeof elements === 'object' && 'outerHTML' in elements) {
      htmlString = (elements as any).outerHTML;
    } else {
      htmlString = `<p>${String(elements)}</p>`;
    }

    const sanitized = sanitizeHtml(htmlString);
    const sections = detectSections(sanitized);

    if (sections) {
      return {
        content: '',
        sections,
        hasSections: true,
      };
    }

    return {
      content: sanitized,
      hasSections: false,
    };
  } catch (error) {
    throw new TextImportError('Errore nella lettura del file RTF');
  }
}

async function parseDocxFile(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    );

    const sanitized = sanitizeHtml(result.value);
    const sections = detectSections(sanitized);

    if (sections) {
      return {
        content: '',
        sections,
        hasSections: true,
      };
    }

    return {
      content: sanitized,
      hasSections: false,
    };
  } catch (error) {
    throw new TextImportError('Errore nella lettura del file DOCX');
  }
}

export function parsePastedText(text: string): ParsedText {
  const sections = detectSections(text);

  if (sections) {
    return {
      content: '',
      sections,
      hasSections: true,
    };
  }

  return {
    content: sanitizeHtml(convertPlainTextToHtml(text)),
    hasSections: false,
  };
}
