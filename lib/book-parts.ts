/**
 * Parti del libro (dedica, epigrafe, prefazione, epilogo, ringraziamenti, crediti).
 * Puro: usabile da browser, rotte e archivio. Nessun import di server.
 */

import {
  escapeMarkdownBlockLine,
  storedToArchiveMarkdown,
  storedToPlainText,
} from '@/lib/archive-markdown';
import { stripHtmlTags } from '@/lib/export-utils';
import { translations } from '@/lib/i18n/translations';
import { uiLangFromTag } from '@/lib/text-ui-lang';

export type BookPartKey =
  | 'dedication'
  | 'epigraph'
  | 'preface'
  | 'epilogue'
  | 'acknowledgements'
  | 'specific_credits';

export type BookPart = {
  key: BookPartKey;
  text: string;
  source?: string | null;
};

export type BookStructureRow = {
  dedication_content?: string | null;
  dedication_enabled?: boolean | null;
  epigraph_content?: string | null;
  epigraph_source?: string | null;
  epigraph_enabled?: boolean | null;
  preface_content?: string | null;
  preface_enabled?: boolean | null;
  epilogue_content?: string | null;
  epilogue_enabled?: boolean | null;
  acknowledgements_content?: string | null;
  acknowledgements_enabled?: boolean | null;
  specific_credits_content?: string | null;
  specific_credits_enabled?: boolean | null;
};

/** Chiave, colonna testo, colonna interruttore, posizione (come nel PDF). */
export const BOOK_PART_DEFS = [
  {
    key: 'dedication' as const,
    contentCol: 'dedication_content' as const,
    enabledCol: 'dedication_enabled' as const,
    matter: 'front' as const,
  },
  {
    key: 'epigraph' as const,
    contentCol: 'epigraph_content' as const,
    enabledCol: 'epigraph_enabled' as const,
    matter: 'front' as const,
  },
  {
    key: 'preface' as const,
    contentCol: 'preface_content' as const,
    enabledCol: 'preface_enabled' as const,
    matter: 'front' as const,
  },
  {
    key: 'epilogue' as const,
    contentCol: 'epilogue_content' as const,
    enabledCol: 'epilogue_enabled' as const,
    matter: 'back' as const,
  },
  {
    key: 'acknowledgements' as const,
    contentCol: 'acknowledgements_content' as const,
    enabledCol: 'acknowledgements_enabled' as const,
    matter: 'back' as const,
  },
  {
    key: 'specific_credits' as const,
    contentCol: 'specific_credits_content' as const,
    enabledCol: 'specific_credits_enabled' as const,
    matter: 'back' as const,
  },
];

const EM_DASH = '—';

function hasPlainText(stored: string | null | undefined): boolean {
  if (typeof stored !== 'string') return false;
  return storedToPlainText(stored).trim().length > 0;
}

export function selectBookParts(
  row: BookStructureRow | null | undefined
): { front: BookPart[]; back: BookPart[] } {
  if (!row) return { front: [], back: [] };

  const front: BookPart[] = [];
  const back: BookPart[] = [];

  for (const def of BOOK_PART_DEFS) {
    if (row[def.enabledCol] !== true) continue;
    const text = row[def.contentCol];
    if (!hasPlainText(text)) continue;

    const part: BookPart = { key: def.key, text: text as string };
    if (def.key === 'epigraph') {
      const source = typeof row.epigraph_source === 'string' ? row.epigraph_source.trim() : '';
      if (source) part.source = source;
    }

    if (def.matter === 'front') front.push(part);
    else back.push(part);
  }

  return { front, back };
}

/** Titolo nella lingua del testo (it/fr/de/en; altro → en). */
export function bookPartTitle(
  key: BookPartKey,
  languageTag: string | null | undefined
): string {
  const lang = uiLangFromTag(languageTag);
  const t = translations[lang];
  switch (key) {
    case 'dedication':
      return t.sectionTitles.dedication;
    case 'epigraph':
      return t.sectionTitles.epigraph;
    case 'preface':
      return t.exportDialog.preface;
    case 'epilogue':
      return t.exportDialog.epilogue;
    case 'acknowledgements':
      return t.exportDialog.acknowledgements;
    case 'specific_credits':
      return t.exportDialog.specificCredits;
  }
}

/** Blocchi testo semplice (titolo + corpo con stripHtmlTags). */
export function formatBookPartsPlainText(
  parts: readonly BookPart[],
  languageTag: string | null | undefined
): string {
  if (parts.length === 0) return '';
  return parts
    .map((part) => {
      const title = bookPartTitle(part.key, languageTag);
      const body = stripHtmlTags(part.text).trim();
      const lines = [title, '', body];
      if (part.key === 'epigraph' && part.source?.trim()) {
        lines.push('', `${EM_DASH} ${part.source.trim()}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

/** Blocchi Markdown d'archivio (## titolo + storedToArchiveMarkdown). */
export function formatBookPartsArchiveMarkdown(
  parts: readonly BookPart[],
  languageTag: string | null | undefined
): string {
  if (parts.length === 0) return '';
  return parts
    .map((part) => {
      const title = bookPartTitle(part.key, languageTag);
      const body = storedToArchiveMarkdown(part.text).trim();
      const lines = [`## ${title}`, '', body];
      if (part.key === 'epigraph' && part.source?.trim()) {
        const escapedSource = part.source
          .trim()
          .split('\n')
          .map((line, index) =>
            index === 0
              ? `${EM_DASH} ${escapeMarkdownBlockLine(line)}`
              : escapeMarkdownBlockLine(line)
          )
          .join('\n');
        lines.push('', escapedSource);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export const BOOK_STRUCTURE_SELECT = [
  'dedication_content',
  'dedication_enabled',
  'epigraph_content',
  'epigraph_source',
  'epigraph_enabled',
  'preface_content',
  'preface_enabled',
  'epilogue_content',
  'epilogue_enabled',
  'acknowledgements_content',
  'acknowledgements_enabled',
  'specific_credits_content',
  'specific_credits_enabled',
].join(', ');
