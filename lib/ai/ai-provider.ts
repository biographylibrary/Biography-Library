import { callAI } from './ai-client';
import type { BiographyNarrativeContext } from '@/lib/biography-narrative-context';
import { isMemorialNarrative } from '@/lib/biography-narrative-context';

function memorialPayload(narrative?: BiographyNarrativeContext): Record<string, string> {
  if (!narrative || !isMemorialNarrative(narrative)) return {};
  return {
    biographyType: 'memorial',
    subjectName: narrative.subjectName,
    writerName: narrative.writerName,
  };
}

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

export interface Improvement {
  type: 'clarity' | 'detail' | 'flow' | 'style' | 'structure';
  original: string;
  suggestion: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

function determineImprovementType(explanation: string): Improvement['type'] {
  const lower = explanation.toLowerCase();
  if (lower.includes('clear') || lower.includes('confus')) return 'clarity';
  if (lower.includes('detail') || lower.includes('specific')) return 'detail';
  if (lower.includes('flow') || lower.includes('transition')) return 'flow';
  if (lower.includes('style') || lower.includes('tone')) return 'style';
  if (lower.includes('structure') || lower.includes('organiz')) return 'structure';
  return 'style';
}

function determinePriority(explanation: string): Improvement['priority'] {
  const lower = explanation.toLowerCase();
  if (lower.includes('error') || lower.includes('incorrect') || lower.includes('wrong')) {
    return 'high';
  }
  if (lower.includes('could') || lower.includes('consider') || lower.includes('might')) {
    return 'low';
  }
  return 'medium';
}

export const aiService = {
  async suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]> {
    const result = await callAI({
      action: 'grammar',
      sectionTitle: section,
      content: text,
      language,
    });

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any) => ({
      type: determineImprovementType(item.explanation),
      original: item.original || '',
      suggestion: item.suggestion || '',
      reason: item.explanation || '',
      priority: determinePriority(item.explanation),
    }));
  },

  async checkGrammar(
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<Array<{ id: string; original: string; suggestion: string; explanation: string }>> {
    const result = await callAI({
      action: 'grammar',
      sectionTitle,
      content,
      language,
    });

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any, index: number) => ({
      id: item.id || `suggestion-${Date.now()}-${index}`,
      original: item.original || '',
      suggestion: item.suggestion || '',
      explanation: item.explanation || '',
    }));
  },

  async getGuidedPrompts(
    sectionKey: string,
    sectionTitle: string,
    language: string,
    narrative?: BiographyNarrativeContext
  ): Promise<Array<{ prompt: string; starter: string }>> {
    const result = await callAI({
      action: 'prompts',
      sectionKey,
      sectionTitle,
      language,
      ...memorialPayload(narrative),
    });

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any) => ({
      prompt: item.prompt || '',
      starter: item.starter || '',
    }));
  },

  async getSummary(
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<string> {
    const result = await callAI({
      action: 'summary',
      sectionTitle,
      content,
      language,
    });

    return result.summary || '';
  },

  async rewriteSection(
    sectionTitle: string,
    content: string,
    tone: string,
    language: string
  ): Promise<string> {
    const result = await callAI({
      action: 'rewrite',
      sectionTitle,
      content,
      tone,
      language,
    });

    return result.rewrittenText || content;
  },
};
