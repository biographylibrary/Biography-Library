export interface Improvement {
  type: 'clarity' | 'detail' | 'flow' | 'style' | 'structure';
  original: string;
  suggestion: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIProvider {
  improveGrammar(text: string, language: string): Promise<string>;

  suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]>;

  rewriteSection(
    text: string,
    tone: string,
    language: string
  ): Promise<string>;

  generateSummary(text: string, language: string): Promise<string>;

  suggestTitles(
    biographyContent: string,
    count: number,
    language: string
  ): Promise<string[]>;

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
}

class ClaudeProvider implements AIProvider {
  private AI_FUNCTION_URL: string;

  constructor() {
    this.AI_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;
  }

  private async callAiFunction(
    token: string,
    body: Record<string, any>
  ): Promise<any> {
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

  async improveGrammar(text: string, language: string): Promise<string> {
    throw new Error('Method not fully implemented. Use checkGrammar instead.');
  }

  async suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]> {
    const token = await this.getAuthToken();

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

  async rewriteSection(
    text: string,
    tone: string,
    language: string
  ): Promise<string> {
    throw new Error('Method not implemented yet. This will be added in future updates.');
  }

  async generateSummary(text: string, language: string): Promise<string> {
    const token = await this.getAuthToken();

    const result = await this.callAiFunction(token, {
      action: 'summary',
      sectionTitle: 'Biography Section',
      content: text,
      language,
    });

    return result.summary || '';
  }

  async suggestTitles(
    biographyContent: string,
    count: number,
    language: string
  ): Promise<string[]> {
    throw new Error('Method not implemented yet. This will be added in future updates.');
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

  private async getAuthToken(): Promise<string> {
    throw new Error('Auth token must be provided directly to methods');
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

class EuriaProvider implements AIProvider {
  private EURIA_API_URL: string;

  constructor() {
    this.EURIA_API_URL = process.env.EURIA_API_URL || 'https://api.infomaniak.com/euria/v1';
  }

  async improveGrammar(text: string, language: string): Promise<string> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async rewriteSection(
    text: string,
    tone: string,
    language: string
  ): Promise<string> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async generateSummary(text: string, language: string): Promise<string> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async suggestTitles(
    biographyContent: string,
    count: number,
    language: string
  ): Promise<string[]> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async checkGrammar(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<Array<{ id: string; original: string; suggestion: string; explanation: string }>> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async getGuidedPrompts(
    token: string,
    sectionKey: string,
    sectionTitle: string,
    language: string
  ): Promise<Array<{ prompt: string; starter: string }>> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }

  async getSummary(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<string> {
    throw new Error('Euria provider not yet implemented. Coming soon!');
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'claude';

  switch (provider.toLowerCase()) {
    case 'euria':
      return new EuriaProvider();
    case 'claude':
    default:
      return new ClaudeProvider();
  }
}

export const aiService = getAIProvider();
