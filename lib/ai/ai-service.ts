export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string
};

const AI_PROVIDER = process.env.AI_PROVIDER || 'infomaniak';

const INFOMANIAK_ENDPOINT =
  process.env.INFOMANIAK_AI_ENDPOINT ||
  'https://api.infomaniak.com/2/ai/107001/openai/v1/chat/completions';

const INFOMANIAK_MODEL = process.env.INFOMANIAK_AI_MODEL || 'mistral3';

const INFOMANIAK_TOKEN = process.env.INFOMANIAK_AI_TOKEN;

if (!INFOMANIAK_TOKEN) {
  console.warn('⚠️ INFOMANIAK_AI_TOKEN not set. AI features will not work.');
}

async function callInfomaniakAI(
  messages: AIMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {

  if (!INFOMANIAK_TOKEN) {
    throw new Error('INFOMANIAK_AI_TOKEN is not configured. Add to .env file.');
  }

  const response = await fetch(INFOMANIAK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INFOMANIAK_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: INFOMANIAK_MODEL,
      messages: messages,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Infomaniak AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    throw new Error('Invalid response from Infomaniak AI');
  }

  return data.choices[0].message.content;
}

export const aiService = {

  getProvider(): string {
    return AI_PROVIDER;
  },

  isConfigured(): boolean {
    return !!INFOMANIAK_TOKEN;
  },

  async chat(
    messages: AIMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    return callInfomaniakAI(messages, options);
  },

  async improveGrammar(text: string, language: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are the AI supervisor of Biography Library. Improve grammar and style while preserving the author's voice. Respond in ${language}.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];
    return this.chat(messages, { temperature: 0.3, maxTokens: 2000 });
  },

  async suggestContent(text: string, context: string, language: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You help expand biography content. Based on "${context}", suggest detailed expansions in ${language}.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];
    return this.chat(messages, { temperature: 0.7, maxTokens: 1500 });
  },

  async generateSummary(text: string, language: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Summarize this biography text in ${language}, keeping key facts and emotional tone.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];
    return this.chat(messages, { temperature: 0.4, maxTokens: 600 });
  },

  async suggestTitles(
    biographyContent: string,
    language: string,
    count: number = 5
  ): Promise<string[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Based on the full biography, suggest ${count} powerful titles in ${language}. Return only the titles, one per line.`,
      },
      {
        role: 'user',
        content: biographyContent,
      },
    ];

    const result = await this.chat(messages, { temperature: 0.8, maxTokens: 500 });

    return result
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, count);
  },

  async suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are the AI supervisor of Biography Library. Analyze the "${section}" section and suggest concrete improvements for clarity, detail, flow, and style. Respond in ${language}.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];
    return this.chat(messages, { temperature: 0.5, maxTokens: 2000 });
  },

};
