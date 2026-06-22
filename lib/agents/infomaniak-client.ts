import {
  AgentRole,
  getModelForRole,
  getModelParams,
  listAvailableModelIds,
  resolveInfomaniakBaseUrl,
} from './models';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatCompletionResult {
  content: string;
  tool_calls?: ToolCall[];
  modelUsed: string;
  finish_reason?: string;
}

export interface ChatStreamChunk {
  type: 'token' | 'tool_calls' | 'done';
  content?: string;
  tool_calls?: ToolCall[];
  modelUsed?: string;
  finish_reason?: string;
}

export interface ChatOptions {
  role?: AgentRole;
  model?: string;
  fallbackModel?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  timeoutMs?: number;
}

function getToken(): string {
  const token = process.env.INFOMANIAK_AI_TOKEN ?? '';
  if (!token) throw new Error('INFOMANIAK_AI_TOKEN is not configured');
  return token;
}

function buildPayload(options: ChatOptions, model: string, stream: boolean): Record<string, unknown> {
  const role = options.role ?? 'coach';
  const params = getModelParams(role);
  const payload: Record<string, unknown> = {
    model,
    messages: options.messages,
    max_tokens: options.max_tokens ?? params.max_tokens,
    temperature: options.temperature ?? params.temperature,
    stream,
  };
  if (options.tools?.length) {
    payload.tools = options.tools;
    if (options.tool_choice) payload.tool_choice = options.tool_choice;
  }
  return payload;
}

async function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs = 30_000
): Promise<Response> {
  const baseUrl = resolveInfomaniakBaseUrl();
  if (!baseUrl) throw new Error('INFOMANIAK_AI_BASE_URL or INFOMANIAK_AI_ENDPOINT is not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchModelIds(): Promise<string[]> {
  const baseUrl = resolveInfomaniakBaseUrl();
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
  const json = (await res.json()) as { data?: { id: string }[] };
  return (json.data ?? []).map((m) => m.id);
}

async function resolveModels(options: ChatOptions): Promise<[string, string]> {
  const role = options.role ?? 'coach';
  const { primary, fallback } = getModelForRole(role);
  const primaryModel = options.model ?? primary;
  const fallbackModel = options.fallbackModel ?? fallback;
  try {
    const available = await listAvailableModelIds(fetchModelIds);
    const p = available.has(primaryModel) ? primaryModel : fallbackModel;
    const f = available.has(fallbackModel) ? fallbackModel : primaryModel;
    return [p, f];
  } catch {
    return [primaryModel, fallbackModel];
  }
}

export async function chat(options: ChatOptions): Promise<ChatCompletionResult> {
  const [primary, fallback] = await resolveModels(options);
  const models = primary === fallback ? [primary] : [primary, fallback];
  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError: Error | undefined;

  for (const model of models) {
    try {
      const res = await postJson('/chat/completions', buildPayload(options, model, false), timeoutMs);
      if (!res.ok) {
        const text = await res.text();
        if (res.status >= 500 || res.status === 429) {
          lastError = new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
          continue;
        }
        throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      const choice = json?.choices?.[0];
      const message = choice?.message ?? {};
      return {
        content: message.content ?? '',
        tool_calls: message.tool_calls,
        modelUsed: model,
        finish_reason: choice?.finish_reason,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (model === models[models.length - 1]) break;
    }
  }
  throw lastError ?? new Error('All AI models failed');
}

export async function* chatStream(options: ChatOptions): AsyncGenerator<ChatStreamChunk> {
  const [primary, fallback] = await resolveModels(options);
  const models = primary === fallback ? [primary] : [primary, fallback];
  const timeoutMs = options.timeoutMs ?? 120_000;
  let lastError: Error | undefined;

  for (const model of models) {
    try {
      const res = await postJson('/chat/completions', buildPayload(options, model, true), timeoutMs);
      if (!res.ok) {
        const text = await res.text();
        if (res.status >= 500 || res.status === 429) {
          lastError = new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
          continue;
        }
        throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.body) throw new Error('No response body for stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const toolCallsAcc: Record<number, ToolCall> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            yield { type: 'done', modelUsed: model };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              yield { type: 'token', content: delta.content, modelUsed: model };
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) {
                  toolCallsAcc[idx] = {
                    id: tc.id ?? '',
                    type: 'function',
                    function: { name: tc.function?.name ?? '', arguments: '' },
                  };
                }
                if (tc.id) toolCallsAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallsAcc[idx].function.name = tc.function.name;
                if (tc.function?.arguments) {
                  toolCallsAcc[idx].function.arguments += tc.function.arguments;
                }
              }
            }
            const finish = parsed?.choices?.[0]?.finish_reason;
            if (finish === 'tool_calls') {
              yield {
                type: 'tool_calls',
                tool_calls: Object.values(toolCallsAcc),
                modelUsed: model,
                finish_reason: finish,
              };
            }
          } catch {
            // skip malformed SSE chunk
          }
        }
      }
      yield { type: 'done', modelUsed: model };
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (model === models[models.length - 1]) break;
    }
  }
  throw lastError ?? new Error('All AI models failed');
}

export async function embed(texts: string[]): Promise<number[][]> {
  const { primary } = getModelForRole('embedding');
  const model = process.env.AGENT_EMBEDDING_MODEL ?? primary;
  const res = await postJson('/embeddings', { model, input: texts }, 60_000);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embeddings HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const data = json?.data as { embedding: number[] }[] | undefined;
  if (!data?.length) throw new Error('Empty embeddings response');
  return data.map((d) => d.embedding);
}

export async function listModels(): Promise<string[]> {
  return fetchModelIds();
}
