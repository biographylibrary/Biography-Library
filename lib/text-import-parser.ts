import * as mammoth from 'mammoth';
import { RTFJS } from 'rtf.js';
import {
  appendHtml,
  stripHtmlToPlain,
} from '@/lib/import/html-blocks';
import {
  detectSectionsFromHtml,
  MAMMOTH_STYLE_MAP,
  normalizeImportedHtml,
  sanitizeHtml,
  type HtmlHeadingChunk,
} from '@/lib/import/html-normalizer';
import type { Language } from '@/lib/i18n/translations';

export interface ParsedSection {
  title: string;
  content: string;
  sectionKey?: string | null;
  confidence?: 'high' | 'medium' | 'low' | 'none';
}

export interface ParsedText {
  content: string;
  sections?: ParsedSection[];
  headingChunks?: HtmlHeadingChunk[];
  hasSections: boolean;
  fileNames?: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 10;

export class TextImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextImportError';
  }
}

function detectTextSections(text: string): ParsedSection[] | null {
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

      if (sections.length > 0) return sections;
    }
  }

  return null;
}

function convertPlainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('# ')) {
        return `<h1>${escapeHtml(trimmed.substring(2))}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${escapeHtml(trimmed.substring(3))}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${escapeHtml(trimmed.substring(4))}</h3>`;
      }

      return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mergeParsed(results: ParsedText[]): ParsedText {
  if (results.length === 0) {
    return { content: '', hasSections: false };
  }
  if (results.length === 1) return results[0];

  const hasAnySections = results.some((r) => r.hasSections && r.sections?.length);
  if (hasAnySections) {
    const sections: ParsedSection[] = [];
    for (const r of results) {
      if (r.hasSections && r.sections?.length) {
        sections.push(...r.sections);
      } else if (r.content.trim()) {
        sections.push({ title: '', content: r.content });
      }
    }
    return {
      content: '',
      sections,
      hasSections: sections.length > 0,
      fileNames: results.flatMap((r) => r.fileNames ?? []),
    };
  }

  const content = results.reduce((acc, r) => appendHtml(acc, r.content), '');
  return {
    content,
    hasSections: false,
    fileNames: results.flatMap((r) => r.fileNames ?? []),
  };
}

function finalizeParsed(
  content: string,
  language: Language,
  fileName?: string
): ParsedText {
  const normalized = normalizeImportedHtml(content);
  const htmlSections = detectSectionsFromHtml(normalized, language);

  if (htmlSections && htmlSections.length > 0) {
    return {
      content: '',
      sections: htmlSections.map((s) => ({
        title: s.title,
        content: s.content,
        sectionKey: s.sectionKey,
        confidence: s.confidence,
      })),
      headingChunks: htmlSections.map((s) => ({ title: s.title, html: s.content })),
      hasSections: htmlSections.some((s) => s.title),
      fileNames: fileName ? [fileName] : undefined,
    };
  }

  const textSections = detectTextSections(stripHtmlToPlain(normalized));
  if (textSections) {
    return {
      content: '',
      sections: textSections,
      hasSections: true,
      fileNames: fileName ? [fileName] : undefined,
    };
  }

  return {
    content: normalized,
    hasSections: false,
    fileNames: fileName ? [fileName] : undefined,
  };
}

export async function parseTextFile(
  file: File,
  language: Language = 'en'
): Promise<ParsedText> {
  if (file.size > MAX_FILE_SIZE) {
    throw new TextImportError('FILE_TOO_LARGE');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    let raw: ParsedText;
    switch (extension) {
      case 'txt':
        raw = await parseTxtFile(file);
        break;
      case 'rtf':
        raw = await parseRtfFile(file);
        break;
      case 'docx':
        raw = await parseDocxFile(file);
        break;
      case 'doc':
        throw new TextImportError('DOC_UNSUPPORTED');
      default:
        throw new TextImportError('FORMAT_UNSUPPORTED');
    }
    return finalizeParsed(raw.content, language, file.name);
  } catch (error) {
    if (error instanceof TextImportError) throw error;
    throw new TextImportError('READ_ERROR');
  }
}

export async function parseTextFiles(
  files: File[],
  language: Language = 'en'
): Promise<ParsedText> {
  if (files.length > MAX_FILES) {
    throw new TextImportError('TOO_MANY_FILES');
  }
  const parsed: ParsedText[] = [];
  for (const file of files) {
    parsed.push(await parseTextFile(file, language));
  }
  const merged = mergeParsed(parsed);
  if (merged.hasSections && merged.sections) {
    return {
      ...merged,
      headingChunks: merged.sections.map((s) => ({ title: s.title, html: s.content })),
    };
  }
  return finalizeParsed(merged.content, language);
}

async function parseTxtFile(file: File): Promise<ParsedText> {
  const text = await file.text();
  return { content: sanitizeHtml(convertPlainTextToHtml(text)), hasSections: false };
}

async function parseRtfFile(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const doc = new RTFJS.Document(arrayBuffer, {});
    const elements = await doc.render();

    let htmlString = '';
    if (Array.isArray(elements)) {
      elements.forEach((el: { outerHTML?: string } | string) => {
        if (el && typeof el === 'object' && 'outerHTML' in el) {
          htmlString += el.outerHTML;
        } else if (typeof el === 'string') {
          htmlString += `<p>${escapeHtml(el)}</p>`;
        }
      });
    } else if (elements && typeof elements === 'object' && 'outerHTML' in elements) {
      htmlString = (elements as { outerHTML: string }).outerHTML;
    } else {
      htmlString = `<p>${String(elements)}</p>`;
    }

    return { content: sanitizeHtml(htmlString), hasSections: false };
  } catch {
    throw new TextImportError('RTF_READ_ERROR');
  }
}

async function parseDocxFile(file: File): Promise<ParsedText> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      { styleMap: MAMMOTH_STYLE_MAP }
    );

    return { content: sanitizeHtml(result.value), hasSections: false };
  } catch {
    throw new TextImportError('DOCX_READ_ERROR');
  }
}

export function parsePastedText(text: string, language: Language = 'en'): ParsedText {
  const sections = detectTextSections(text);

  if (sections) {
    return {
      content: '',
      sections,
      hasSections: true,
    };
  }

  return finalizeParsed(sanitizeHtml(convertPlainTextToHtml(text)), language);
}

export function getImportErrorMessage(
  code: string,
  t: { importDialog: Record<string, string> }
): string {
  const map: Record<string, string> = {
    FILE_TOO_LARGE: t.importDialog.fileTooLarge,
    DOC_UNSUPPORTED: t.importDialog.docUnsupported,
    FORMAT_UNSUPPORTED: t.importDialog.formatUnsupported,
    READ_ERROR: t.importDialog.fileReadError,
    RTF_READ_ERROR: t.importDialog.fileReadError,
    DOCX_READ_ERROR: t.importDialog.fileReadError,
    TOO_MANY_FILES: t.importDialog.tooManyFiles,
  };
  return map[code] ?? t.importDialog.fileReadError;
}
