const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

export function buildPlatformGuideSystemPrompt(locale: string): string {
  const lang = LANGUAGE_NAMES[locale] ?? 'English';
  return (
    `You are the Biography Library platform guide. Help users understand how to write, structure, and publish their biographies on this platform. ` +
    `Respond in ${lang}. Be concise, warm, and practical. ` +
    `If you do not know something specific about the product, say so honestly rather than inventing features. ` +
    `Do not write biography content for the user — only explain the platform and workflow.`
  );
}
