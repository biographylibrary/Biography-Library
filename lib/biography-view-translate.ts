import { createHash } from 'crypto';
import { chat } from '@/lib/agents/infomaniak-client';
import { biographySectionToSafeHtml } from '@/lib/biography-section-html';
import { sanitizeHtmlString } from '@/lib/import/html-normalizer';
import type { BiographyViewRow } from '@/lib/server/biography-view-access';

const SUPPORTED_LANGUAGES = ['en', 'it', 'fr', 'de'] as const;
export type ViewLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isViewLanguage(value: string): value is ViewLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function sectionContentHash(html: string): string {
  return createHash('sha256').update(html.trim()).digest('hex');
}

export function getBiographySectionEntries(bio: BiographyViewRow): Array<{ key: string; html: string }> {
  if (bio.biography_mode === 'freeflow') {
    const text = bio.content_freeflow?.trim() ?? '';
    if (!text) return [];
    return [{ key: 'freeflow', html: biographySectionToSafeHtml(text) }];
  }

  const content = bio.content ?? {};
  return Object.entries(content)
    .filter(([, section]) => section?.text?.trim())
    .map(([key, section]) => ({
      key,
      html: biographySectionToSafeHtml(section!.text!),
    }));
}

const LANGUAGE_NAMES: Record<ViewLanguage, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

export async function translateSectionHtml(
  html: string,
  sourceLanguage: ViewLanguage,
  targetLanguage: ViewLanguage
): Promise<string> {
  const systemPrompt =
    'You are a professional literary translator for personal biographies. ' +
    'Translate the HTML content faithfully. Preserve all HTML tags and structure exactly. ' +
    'Do not add facts, commentary, or markup. Return only the translated HTML.';

  const userPrompt =
    `Translate this biography section from ${LANGUAGE_NAMES[sourceLanguage]} to ${LANGUAGE_NAMES[targetLanguage]}.\n\n` +
    html;

  const result = await chat({
    role: 'coach',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.3,
    timeoutMs: 120_000,
  });

  const translated = result.content.trim();
  return sanitizeHtmlString(translated || html);
}
