/**
 * Promemoria: parti della struttura del libro compilate nell'originale
 * e non ancora nell'edizione. Puro, senza I/O.
 */

import { storedToPlainText } from '@/lib/archive-markdown';

export type BookStructureReminderPart =
  | 'authorCopyrightPage'
  | 'dedication'
  | 'epigraph'
  | 'preface'
  | 'epilogue'
  | 'acknowledgements'
  | 'credits';

export type BookStructureReminderSnapshot = {
  include_author_copyright_page?: boolean | null;
  dedication_enabled?: boolean | null;
  dedication_content?: string | null;
  epigraph_enabled?: boolean | null;
  epigraph_content?: string | null;
  preface_enabled?: boolean | null;
  preface_content?: string | null;
  epilogue_enabled?: boolean | null;
  epilogue_content?: string | null;
  acknowledgements_enabled?: boolean | null;
  acknowledgements_content?: string | null;
  specific_credits_enabled?: boolean | null;
  specific_credits_content?: string | null;
};

function hasBody(stored: string | null | undefined): boolean {
  if (typeof stored !== 'string') return false;
  return storedToPlainText(stored).trim().length > 0;
}

function partFilled(
  snapshot: BookStructureReminderSnapshot | null | undefined,
  part: BookStructureReminderPart
): boolean {
  if (!snapshot) return false;
  switch (part) {
    case 'authorCopyrightPage':
      return snapshot.include_author_copyright_page === true;
    case 'dedication':
      return snapshot.dedication_enabled === true && hasBody(snapshot.dedication_content);
    case 'epigraph':
      return snapshot.epigraph_enabled === true && hasBody(snapshot.epigraph_content);
    case 'preface':
      return snapshot.preface_enabled === true && hasBody(snapshot.preface_content);
    case 'epilogue':
      return snapshot.epilogue_enabled === true && hasBody(snapshot.epilogue_content);
    case 'acknowledgements':
      return (
        snapshot.acknowledgements_enabled === true && hasBody(snapshot.acknowledgements_content)
      );
    case 'credits':
      return (
        snapshot.specific_credits_enabled === true && hasBody(snapshot.specific_credits_content)
      );
  }
}

const PART_ORDER: BookStructureReminderPart[] = [
  'authorCopyrightPage',
  'dedication',
  'epigraph',
  'preface',
  'epilogue',
  'acknowledgements',
  'credits',
];

/** Parti compilate nell'originale e non ancora nell'edizione. */
export function missingBookStructurePartsComparedToOriginal(
  original: BookStructureReminderSnapshot | null | undefined,
  edition: BookStructureReminderSnapshot | null | undefined
): BookStructureReminderPart[] {
  return PART_ORDER.filter(
    (part) => partFilled(original, part) && !partFilled(edition, part)
  );
}
