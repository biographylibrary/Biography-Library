import type { AiSuggestion, AiPrompt } from './ai-constants';
import { aiService, AiLimitError } from './ai/ai-provider';

export { AiLimitError };

const AI_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;

async function callAiFunction(
  token: string,
  body: Record<string, unknown>
): Promise<any> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    if (data.limitType === 'daily' || data.limitType === 'weekly') {
      throw new AiLimitError(data.limitType as 'daily' | 'weekly', data.resetAt, data.dailyLimit ?? 40, data.weeklyLimit ?? 150);
    }
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }

  if (res.status === 503) {
    throw new Error('AI service is not configured yet.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('AI request failed:', { status: res.status, statusText: res.statusText, data });
    const errorMsg = data.error || `AI request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function checkGrammar(
  token: string,
  sectionTitle: string,
  content: string,
  language: string = 'en'
): Promise<AiSuggestion[]> {
  const results = await aiService.checkGrammar(token, sectionTitle, content, language);

  return results.map((item) => ({
    id: item.id,
    original: item.original,
    suggestion: item.suggestion,
    explanation: item.explanation,
    status: 'pending' as const,
  }));
}

export async function getGuidedPrompts(
  token: string,
  sectionKey: string,
  sectionTitle: string,
  language: string = 'en'
): Promise<AiPrompt[]> {
  return await aiService.getGuidedPrompts(token, sectionKey, sectionTitle, language);
}

export async function getSummary(
  token: string,
  sectionTitle: string,
  content: string,
  language: string = 'en'
): Promise<string> {
  return await aiService.getSummary(token, sectionTitle, content, language);
}
