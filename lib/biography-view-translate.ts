import { createHash } from 'crypto';
import { chat } from '@/lib/agents/infomaniak-client';
import {
  archiveMarkdownToHtml,
  storedToArchiveMarkdown,
} from '@/lib/archive-markdown';
import type { BiographyViewRow } from '@/lib/server/biography-view-access';

const SUPPORTED_LANGUAGES = ['en', 'it', 'fr', 'de'] as const;
export type ViewLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isViewLanguage(value: string): value is ViewLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function sectionContentHash(markdown: string): string {
  return createHash('sha256').update(markdown.trim()).digest('hex');
}

export function getBiographySectionEntries(
  bio: BiographyViewRow
): Array<{ key: string; markdown: string; html: string }> {
  if (bio.biography_mode === 'freeflow') {
    const text = bio.content_freeflow?.trim() ?? '';
    if (!text) return [];
    const markdown = storedToArchiveMarkdown(text);
    return [{ key: 'freeflow', markdown, html: archiveMarkdownToHtml(markdown) }];
  }

  const content = bio.content ?? {};
  return Object.entries(content)
    .filter(([, section]) => section?.text?.trim())
    .map(([key, section]) => {
      const markdown = storedToArchiveMarkdown(section!.text!);
      return { key, markdown, html: archiveMarkdownToHtml(markdown) };
    });
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
  return translateSectionMarkdown(
    storedToArchiveMarkdown(html),
    sourceLanguage,
    targetLanguage
  );
}

export async function translateSectionMarkdown(
  markdown: string,
  sourceLanguage: ViewLanguage,
  targetLanguage: ViewLanguage
): Promise<string> {
  const systemPrompt =
    'You are a professional literary translator for personal biographies. ' +
    'Translate the Markdown content faithfully. Preserve CommonMark structure exactly: ' +
    'headings, **bold**, *italic*, lists, block quotes, and [links](url). ' +
    'Do not add facts, commentary, or HTML. Return only the translated Markdown.';

  const userPrompt =
    `Translate this biography section from ${LANGUAGE_NAMES[sourceLanguage]} to ${LANGUAGE_NAMES[targetLanguage]}.\n\n` +
    markdown;

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
  return archiveMarkdownToHtml(translated || markdown);
}
