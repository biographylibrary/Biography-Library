import type { Language } from '@/lib/i18n/translations';

const WRITTEN_BY: Record<Language, string> = {
  en: 'Written by',
  it: 'Scritto da',
  fr: 'Écrit par',
  de: 'Geschrieben von',
};

export function memorialSubjectName(
  subjectName: string | null | undefined,
  title: string | null | undefined
): string {
  return subjectName?.trim() || title?.trim() || '';
}

/** Single-line credit (legacy / compact contexts). */
export function formatMemorialCreditLine(
  subjectName: string,
  authorName: string,
  lang: Language = 'en'
): string {
  const subject = subjectName.trim();
  const author = authorName.trim();
  if (!subject) return author;
  if (!author) return subject;
  const connector = WRITTEN_BY[lang] ?? WRITTEN_BY.en;
  return `${subject} - ${connector} ${author}`;
}

/** Memorial cover / title card: author line below subject name. */
export function formatMemorialAuthorAttribution(
  authorName: string,
  lang: Language = 'en'
): string {
  const author = authorName.trim();
  if (!author) return '';
  const connector = WRITTEN_BY[lang] ?? WRITTEN_BY.en;
  return `${connector} ${author}`;
}

export function isMemorialBiography(
  biographyType: string | null | undefined
): biographyType is 'memorial' {
  return biographyType === 'memorial';
}

/** Resolve title/author strings passed to PDF layout without changing templates. */
export function resolvePdfBiographyLabels(
  bio: {
    title: string;
    author_name: string;
    subject_name?: string | null;
    biography_type?: string | null;
  },
  lang: Language = 'en'
): { title: string; author_name: string } {
  if (isMemorialBiography(bio.biography_type)) {
    const subject = memorialSubjectName(bio.subject_name, bio.title);
    if (subject) {
      return {
        title: subject,
        author_name: formatMemorialAuthorAttribution(bio.author_name ?? '', lang),
      };
    }
  }
  return { title: bio.title, author_name: bio.author_name };
}
