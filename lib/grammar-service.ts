import type { AiSuggestion } from '@/lib/ai-constants';
import { fetchWithAgentAuth } from '@/lib/auth-token';

/** Tetto giornaliero o settimanale del controllo grammaticale superato (429 con limitType). */
export class AiLimitError extends Error {
  limitType: 'daily' | 'weekly';
  resetAt: string;
  dailyLimit: number;
  weeklyLimit: number;

  constructor(limitType: 'daily' | 'weekly', resetAt: string, dailyLimit: number, weeklyLimit: number) {
    super(limitType === 'daily' ? 'daily_limit_reached' : 'weekly_limit_reached');
    this.name = 'AiLimitError';
    this.limitType = limitType;
    this.resetAt = resetAt;
    this.dailyLimit = dailyLimit;
    this.weeklyLimit = weeklyLimit;
  }
}

const CLIENT_TIMEOUT_MS = 55_000;

function normalizeGrammarText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function isValidGrammarSuggestion(original: string, suggestion: string): boolean {
  const o = normalizeGrammarText(original);
  const s = normalizeGrammarText(suggestion);
  return Boolean(o && s && o !== s);
}

/**
 * Controllo grammaticale su richiesta: POST /api/biography/{id}/grammar.
 * Il testo è nel corpo perché l'autore corregge anche testo non ancora salvato.
 * I messaggi di errore (tetto di token, testo troppo lungo) arrivano dal server
 * già nella lingua dell'autore.
 */
export async function checkGrammar(
  biographyId: string,
  sectionTitle: string,
  content: string,
  language: string = 'en',
  uiLanguage?: string
): Promise<AiSuggestion[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchWithAgentAuth(`/api/biography/${encodeURIComponent(biographyId)}/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionTitle,
        content,
        language,
        ...(uiLanguage ? { uiLanguage } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('AI_TIMEOUT');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    if (data.limitType === 'daily' || data.limitType === 'weekly') {
      throw new AiLimitError(
        data.limitType,
        data.resetAt,
        data.dailyLimit ?? 40,
        data.weeklyLimit ?? 200
      );
    }
    throw new Error(data.message || data.error || 'Rate limit exceeded. Please wait a moment before trying again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `AI request failed with status ${res.status}`);
  }

  const result = await res.json();
  const raw: unknown[] = Array.isArray(result.data) ? result.data : [];
  return raw
    .map((item: any, index: number) => ({
      id: item.id || `suggestion-${Date.now()}-${index}`,
      original: item.original || '',
      suggestion: item.suggestion || '',
      explanation: item.explanation || '',
      status: 'pending' as const,
    }))
    .filter((item) => isValidGrammarSuggestion(item.original, item.suggestion));
}
