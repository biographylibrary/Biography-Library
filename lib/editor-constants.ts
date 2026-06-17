export const BIOGRAPHY_SECTIONS = [
  { key: 'childhood', title: 'Childhood & Early Years' },
  { key: 'family', title: 'Family Background' },
  { key: 'education', title: 'Education' },
  { key: 'career', title: 'Career & Work' },
  { key: 'life-events', title: 'Important Life Events' },
  { key: 'relationships', title: 'Relationships & Love' },
  { key: 'challenges', title: 'Challenges & Lessons Learned' },
  { key: 'passions', title: 'Passions & Hobbies' },
  { key: 'legacy', title: 'Legacy & Final Thoughts' },
] as const;

export type SectionKey = (typeof BIOGRAPHY_SECTIONS)[number]['key'];

export interface SectionData {
  text: string;
  todo: boolean;
  audioTranscript: string;
}

export type BiographyContent = Record<string, SectionData>;

export function getEmptyContent(): BiographyContent {
  const content: BiographyContent = {};
  for (const section of BIOGRAPHY_SECTIONS) {
    content[section.key] = { text: '', todo: false, audioTranscript: '' };
  }
  return content;
}

export function getSectionData(
  content: BiographyContent,
  key: string
): SectionData {
  return content[key] || { text: '', todo: false, audioTranscript: '' };
}

/** localStorage: ultimo `biography_mode` usato nell’editor (dashboard: blocco progresso sezioni). */
export function lastBiographyEditorModeStorageKey(biographyId: string): string {
  return `bl_last_biography_editor_mode_${biographyId}`;
}
