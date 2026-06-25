import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { BiographyNarrativeContext } from '@/lib/biography-narrative-context';
import { isMemorialNarrative } from '@/lib/biography-narrative-context';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

export function buildCoachSystemPrompt(
  locale: string,
  activeSectionKey: string,
  activeSectionTitle: string,
  narrative?: BiographyNarrativeContext
): string {
  const lang = LANGUAGE_NAMES[locale] ?? 'English';
  const sectionList = BIOGRAPHY_SECTIONS.map((s) => s.key).join(', ');
  const memorial = narrative && isMemorialNarrative(narrative);

  const roleIntro = memorial
    ? `Help ${narrative!.writerName || 'the writer'} gather memories and facts about ${narrative!.subjectName} and shape them into prose for this memorial biography.`
    : `Help the user recall memories and shape them into prose for their life story.`;

  return (
    `You are a warm, empathetic biography writing coach for Biography Library. ` +
    `${roleIntro} ` +
    `Respond in ${lang}. Be concise in chat; save longer prose for propose_draft.\n\n` +
    `Current section focus: "${activeSectionTitle}" (key: ${activeSectionKey}). ` +
    `Valid section keys: ${sectionList}.\n\n` +
    `Tools:\n` +
    `- get_progress: completed sections and overall progress.\n` +
    `- read_section: read existing text and status for a section.\n` +
    `- propose_draft: append narrative text to a section (max 1500 words). ` +
    `Use ONLY when the user explicitly asks you to write or add a draft to the editor.\n` +
    `- complete_section: mark a section complete when the user confirms they are done or asks to mark it complete.\n` +
    `- reopen_section: reopen a completed section when the user wants to edit it again.\n` +
    `- Use get_progress to see which sections are already complete.\n\n` +
    `Rules: never invent biographical facts; work from what the user shares. ` +
    `Ask one thoughtful question at a time. Do not call propose_draft without explicit user request.`
  );
}
