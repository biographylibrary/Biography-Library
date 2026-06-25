import type { AiSuggestion, AiPrompt } from './ai-constants';
import { aiService, AiLimitError } from './ai/ai-provider';
import { callAI } from './ai/ai-client';
import type { BiographyNarrativeContext } from '@/lib/biography-narrative-context';

export { AiLimitError };

export interface FlaggedPassage {
  text: string;
  reason: string;
  level: 1 | 2 | 3;
}

export interface PrePublicationCheckResult {
  passed: boolean;
  violation_level: 1 | 2 | 3 | null;
  flagged_passages: FlaggedPassage[];
  summary: string;
}

export async function runPrePublicationCheck(
  biographyText: string
): Promise<PrePublicationCheckResult> {
  const result = await callAI({
    action: 'pre-publication-check',
    biographyText,
  });

  return {
    passed: result.passed ?? true,
    violation_level: result.violation_level ?? null,
    flagged_passages: result.flagged_passages ?? [],
    summary: result.summary ?? '',
  };
}

export async function checkGrammar(
  sectionTitle: string,
  content: string,
  language: string = 'en'
): Promise<AiSuggestion[]> {
  const results = await aiService.checkGrammar(sectionTitle, content, language);

  return results.map((item) => ({
    id: item.id,
    original: item.original,
    suggestion: item.suggestion,
    explanation: item.explanation,
    status: 'pending' as const,
  }));
}

export async function getGuidedPrompts(
  sectionKey: string,
  sectionTitle: string,
  language: string = 'en',
  narrative?: BiographyNarrativeContext
): Promise<AiPrompt[]> {
  return await aiService.getGuidedPrompts(sectionKey, sectionTitle, language, narrative);
}

export async function getSummary(
  sectionTitle: string,
  content: string,
  language: string = 'en'
): Promise<string> {
  return await aiService.getSummary(sectionTitle, content, language);
}
