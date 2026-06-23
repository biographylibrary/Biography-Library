import { chat } from '@/lib/agents/infomaniak-client';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

const MAX_CHARS = 6000;

export type ApertusReviewResult = {
  review: string;
  modelUsed: string;
  aiError?: boolean;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function runApertusSectionReview(
  sectionTitle: string,
  content: string,
  language: string
): Promise<ApertusReviewResult> {
  const errorResult: ApertusReviewResult = {
    review: '',
    modelUsed: '',
    aiError: true,
  };

  if (!process.env.INFOMANIAK_AI_TOKEN || !process.env.INFOMANIAK_AI_ENDPOINT) {
    return errorResult;
  }

  const plain = stripHtml(content).slice(0, MAX_CHARS);
  if (plain.length < 20) {
    return { ...errorResult, review: '' };
  }

  const lang = LANGUAGE_NAMES[language.slice(0, 2)] ?? 'English';

  const systemPrompt =
    `You are Apertus, a Swiss-hosted open-source language model assisting Biography Library authors. ` +
    `Give a thoughtful editorial review of one biography section. Respond in ${lang}. ` +
    `Comment on clarity, emotional authenticity, narrative flow, and any gaps worth filling. ` +
    `Be warm and respectful — the author may be elderly. Do not rewrite the full text; offer guidance in plain prose. ` +
    `Do not invent biographical facts. Keep the review under 400 words.`;

  const userPrompt =
    `Section: "${sectionTitle}"\n\n` +
    `Text:\n${plain}\n\n` +
    `Provide your editorial review.`;

  try {
    const result = await chat({
      role: 'apertus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 1024,
      timeoutMs: 60_000,
    });

    const review = (result.content ?? '').trim();
    if (review.length < 10) return errorResult;

    return {
      review,
      modelUsed: result.modelUsed,
    };
  } catch (err) {
    console.error('[apertus-review]', err);
    return errorResult;
  }
}
