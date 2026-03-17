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

export interface AIProvider {
  suggestImprovements(
    token: string,
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]>;

  checkGrammar(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<Array<{ id: string; original: string; suggestion: string; explanation: string }>>;

  getGuidedPrompts(
    token: string,
    sectionKey: string,
    sectionTitle: string,
    language: string
  ): Promise<Array<{ prompt: string; starter: string }>>;

  getSummary(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<string>;

  rewriteSectionWithToken(
    token: string,
    sectionTitle: string,
    content: string,
    tone: string,
    language: string
  ): Promise<string>;
}

class InfomaniakProvider implements AIProvider {
  private AI_FUNCTION_URL: string;

  constructor() {
    this.AI_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;
  }

  private async callAiFunction(
    token: string,
    body: Record<string, any>
  ): Promise<any> {
    if (!token || token.trim() === '') {
      throw new Error('No authentication token available. Please sign in again.');
    }

    const res = await fetch(this.AI_FUNCTION_URL, {
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
        throw new AiLimitError(data.limitType, data.resetAt, data.dailyLimit ?? 40, data.weeklyLimit ?? 150);
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

  async suggestImprovements(
    token: string,
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]> {
    const result = await this.callAiFunction(token, {
      action: 'grammar',
      sectionTitle: section,
      content: text,
      language,
    });

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any) => ({
      type: this.determineImprovementType(item.explanation),
      original: item.original || '',
      suggestion: item.suggestion || '',
      reason: item.explanation || '',
      priority: this.determinePriority(item.explanation),
    }));
  }

  async checkGrammar(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<Array<{ id: string; original: string; suggestion: string; explanation: string }>> {
    const result = await this.callAiFunction(token, {
      action: 'grammar',
      sectionTitle,
      content,
      language,
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from AI service');
    }

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any, index: number) => ({
      id: item.id || `suggestion-${Date.now()}-${index}`,
      original: item.original || '',
      suggestion: item.suggestion || '',
      explanation: item.explanation || '',
    }));
  }

  async getGuidedPrompts(
    token: string,
    sectionKey: string,
    sectionTitle: string,
    language: string
  ): Promise<Array<{ prompt: string; starter: string }>> {
    const result = await this.callAiFunction(token, {
      action: 'prompts',
      sectionKey,
      sectionTitle,
      language,
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from AI service');
    }

    const raw = Array.isArray(result.data) ? result.data : [];
    return raw.map((item: any) => ({
      prompt: item.prompt || '',
      starter: item.starter || '',
    }));
  }

  async getSummary(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<string> {
    const result = await this.callAiFunction(token, {
      action: 'summary',
      sectionTitle,
      content,
      language,
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from AI service');
    }

    return result.summary || '';
  }

  async rewriteSectionWithToken(
    token: string,
    sectionTitle: string,
    content: string,
    tone: string,
    language: string
  ): Promise<string> {
    const result = await this.callAiFunction(token, {
      action: 'rewrite',
      sectionTitle,
      content,
      tone,
      language,
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from AI service');
    }

    return result.rewrittenText || content;
  }

  private determineImprovementType(explanation: string): Improvement['type'] {
    const lower = explanation.toLowerCase();
    if (lower.includes('clear') || lower.includes('confus')) return 'clarity';
    if (lower.includes('detail') || lower.includes('specific')) return 'detail';
    if (lower.includes('flow') || lower.includes('transition')) return 'flow';
    if (lower.includes('style') || lower.includes('tone')) return 'style';
    if (lower.includes('structure') || lower.includes('organiz')) return 'structure';
    return 'style';
  }

  private determinePriority(explanation: string): Improvement['priority'] {
    const lower = explanation.toLowerCase();
    if (lower.includes('error') || lower.includes('incorrect') || lower.includes('wrong')) {
      return 'high';
    }
    if (lower.includes('could') || lower.includes('consider') || lower.includes('might')) {
      return 'low';
    }
    return 'medium';
  }
}

export function getAIProvider(): AIProvider {
  return new InfomaniakProvider();
}

export const aiService = getAIProvider();
