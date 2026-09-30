import {
  AgentRole,
  getModelForRole,
  getModelParams,
  listAvailableModelIds,
  resolveInfomaniakBaseUrl,
} from './models';
import {
  estimateTokens,
  recordAiUsage,
  type AiUsageContext,
} from '@/lib/ai/usage-recorder';

/**
 * Unico client verso Infomaniak AI Services (chat, streaming, embedding).
 * Ogni chiamata a un modello passa da qui e lascia una riga in ai_token_usage
 * (vedi lib/ai/usage-recorder.ts), anche quando fallisce.
 *
 * Eccezione documentata in PROGETTO.md: la trascrizione (Whisper) resta
 * nell'Edge Function `audio-transcription` e la sintesi vocale (Voxtral di
 * Mistral) non passa da Infomaniak; entrambe scrivono la propria riga.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
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

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** True se il fornitore non ha restituito `usage` e il valore è una stima. */
  estimated: boolean;
}

export interface ChatCompletionResult {
  content: string;
  tool_calls?: ToolCall[];
  modelUsed: string;
  finish_reason?: string;
  usage?: TokenUsage;
}

export interface ChatStreamChunk {
  type: 'token' | 'tool_calls' | 'done';
  content?: string;
  tool_calls?: ToolCall[];
  modelUsed?: string;
  finish_reason?: string;
  usage?: TokenUsage;
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
  /** Chi chiama e perché. Obbligatorio: non esiste una chiamata non registrata. */
  usage: AiUsageContext;
  /** Catena esplicita di modelli, nell'ordine di ripiego. Salta il catalogo. */
  models?: string[];
  /** false = solo il modello primario, nessun secondo tentativo nascosto. */
  allowFallback?: boolean;
  /** Nuovi tentativi sullo stesso modello per 429/503/504 o errori di rete. */
  retry?: { attempts: number; baseDelayMs: number };
  /** true = un errore 4xx (tranne 429) interrompe la catena, senza ripiego. */
  stopOnClientError?: boolean;
}

function getToken(): string {
  const token = process.env.INFOMANIAK_AI_TOKEN ?? '';
  if (!token) throw new Error('INFOMANIAK_AI_TOKEN is not configured');
  return token;
}

/** Normalize OpenAI-style message content (string or multipart array). */
export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const p = part as { text?: string; content?: string };
          return p.text ?? p.content ?? '';
        }
        return '';
      })
      .join('');
  }
  return content == null ? '' : String(content);
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

  if (process.env.AGENT_SKIP_MODEL_CATALOG === 'true') {
    return [primaryModel, fallbackModel];
  }

  try {
    const available = await listAvailableModelIds(fetchModelIds);
    const p = available.has(primaryModel) ? primaryModel : fallbackModel;
    const f = available.has(fallbackModel) ? fallbackModel : primaryModel;
    return [p, f];
  } catch {
    return [primaryModel, fallbackModel];
  }
}

async function resolveChain(options: ChatOptions): Promise<string[]> {
  if (options.models?.length) {
    return options.models.filter((m, i, all) => all.indexOf(m) === i);
  }
  if (options.allowFallback === false) {
    const { primary } = getModelForRole(options.role ?? 'coach');
    return [options.model ?? primary];
  }
  const [primary, fallback] = await resolveModels(options);
  return primary === fallback ? [primary] : [primary, fallback];
}

function readUsage(raw: unknown): Omit<TokenUsage, 'estimated'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const prompt = Number(u.prompt_tokens);
  const completion = Number(u.completion_tokens);
  const total = Number(u.total_tokens);
  if (![prompt, completion, total].some((n) => Number.isFinite(n))) return null;
  const p = Number.isFinite(prompt) ? prompt : 0;
  const c = Number.isFinite(completion) ? completion : 0;
  return {
    prompt_tokens: p,
    completion_tokens: c,
    total_tokens: Number.isFinite(total) ? total : p + c,
  };
}

function messagesChars(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => {
    let n = m.content?.length ?? 0;
    for (const tc of m.tool_calls ?? []) {
      n += tc.function.name.length + tc.function.arguments.length;
    }
    return sum + n;
  }, 0);
}

function estimatedUsage(promptChars: number, completionChars: number): TokenUsage {
  const prompt = estimateTokens(promptChars);
  const completion = estimateTokens(completionChars);
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    estimated: true,
  };
}

async function recordOk(ctx: AiUsageContext, model: string, usage: TokenUsage): Promise<void> {
  await recordAiUsage({
    ...ctx,
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    estimated: usage.estimated,
    ok: true,
  });
}

/** Tentativo fallito senza dato di consumo: riga con ok = false e token nulli. */
async function recordFailure(ctx: AiUsageContext, model: string): Promise<void> {
  await recordAiUsage({ ...ctx, model, ok: false });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

function isClientError(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}

export async function chat(options: ChatOptions): Promise<ChatCompletionResult> {
  const models = await resolveChain(options);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const attempts = Math.max(1, options.retry?.attempts ?? 1);
  const baseDelayMs = options.retry?.baseDelayMs ?? 500;
  let lastError: Error | undefined;
  let abortChain = false;

  for (const model of models) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const moreAttempts = attempt < attempts - 1;
      try {
        const res = await postJson('/chat/completions', buildPayload(options, model, false), timeoutMs);
        if (!res.ok) {
          const text = await res.text();
          console.error(`[infomaniak] chat model=${model} HTTP ${res.status}:`, text.slice(0, 300));
          lastError = new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
          await recordFailure(options.usage, model);
          if (isRetryableStatus(res.status) && moreAttempts) {
            await sleep(baseDelayMs * 2 ** attempt);
            continue;
          }
          if (options.stopOnClientError && isClientError(res.status)) abortChain = true;
          break;
        }
        const json = await res.json();
        const choice = json?.choices?.[0];
        const message = choice?.message ?? {};
        const content = extractTextContent(message.content);
        const toolCalls = message.tool_calls as ToolCall[] | undefined;
        const reported = readUsage(json?.usage);
        const usage: TokenUsage = reported
          ? { ...reported, estimated: false }
          : estimatedUsage(
              messagesChars(options.messages),
              content.length +
                (toolCalls ?? []).reduce(
                  (n, tc) => n + tc.function.name.length + tc.function.arguments.length,
                  0
                )
            );
        await recordOk(options.usage, model, usage);
        return {
          content,
          tool_calls: toolCalls,
          modelUsed: model,
          finish_reason: choice?.finish_reason,
          usage,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await recordFailure(options.usage, model);
        if (moreAttempts) {
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        break;
      }
    }
    if (abortChain) break;
  }
  throw lastError ?? new Error('All AI models failed');
}

/** Se l'interfaccia rifiuta stream_options, si riprova senza e si stima l'uso. */
let streamUsageSupported = true;

export async function* chatStream(options: ChatOptions): AsyncGenerator<ChatStreamChunk> {
  const models = await resolveChain(options);
  const timeoutMs = options.timeoutMs ?? 120_000;
  let lastError: Error | undefined;

  for (let m = 0; m < models.length; m++) {
    const model = models[m];
    const isLastModel = m === models.length - 1;
    let reported: Omit<TokenUsage, 'estimated'> | null = null;
    let completionChars = 0;
    let started = false;
    let recorded = false;

    const finalize = async (ok: boolean): Promise<TokenUsage | undefined> => {
      if (recorded) return undefined;
      recorded = true;
      if (!started && !ok) {
        await recordFailure(options.usage, model);
        return undefined;
      }
      const usage: TokenUsage = reported
        ? { ...reported, estimated: false }
        : estimatedUsage(messagesChars(options.messages), completionChars);
      await recordAiUsage({
        ...options.usage,
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimated: usage.estimated,
        ok,
      });
      return usage;
    };

    try {
      const payload = buildPayload(options, model, true);
      if (streamUsageSupported) payload.stream_options = { include_usage: true };
      let res = await postJson('/chat/completions', payload, timeoutMs);

      if (!res.ok && res.status === 400 && streamUsageSupported) {
        const text = await res.text();
        if (/stream_options|include_usage/i.test(text)) {
          console.warn('[infomaniak] stream_options non accettato: uso stimato dai caratteri');
          streamUsageSupported = false;
          delete payload.stream_options;
          res = await postJson('/chat/completions', payload, timeoutMs);
        } else {
          console.error(`[infomaniak] stream model=${model} HTTP ${res.status}:`, text.slice(0, 300));
          lastError = new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
          await finalize(false);
          if (isLastModel) break;
          continue;
        }
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(`[infomaniak] stream model=${model} HTTP ${res.status}:`, text.slice(0, 300));
        lastError = new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
        await finalize(false);
        if (isLastModel) break;
        continue;
      }
      if (!res.body) throw new Error('No response body for stream');

      started = true;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const toolCallsAcc: Record<number, ToolCall> = {};
      let streamOk = false;

      try {
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
              streamOk = true;
              const usage = await finalize(true);
              yield { type: 'done', modelUsed: model, usage };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const chunkUsage = readUsage(parsed?.usage);
              if (chunkUsage) reported = chunkUsage;
              const delta = parsed?.choices?.[0]?.delta;
              if (!delta) continue;
              const token = extractTextContent(delta.content);
              if (token) {
                completionChars += token.length;
                yield { type: 'token', content: token, modelUsed: model };
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
                    completionChars += tc.function.arguments.length;
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
        streamOk = true;
        const usage = await finalize(true);
        yield { type: 'done', modelUsed: model, usage };
        return;
      } finally {
        // Anche se chi consuma si ferma prima della fine, la riga resta scritta.
        await finalize(streamOk);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await finalize(false);
      if (isLastModel) break;
    }
  }
  throw lastError ?? new Error('All AI models failed');
}

export async function embed(texts: string[], usage: AiUsageContext): Promise<number[][]> {
  const { primary } = getModelForRole('embedding');
  const model = process.env.AGENT_EMBEDDING_MODEL ?? primary;
  let res: Response;
  try {
    res = await postJson('/embeddings', { model, input: texts }, 60_000);
  } catch (err) {
    await recordFailure(usage, model);
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    await recordFailure(usage, model);
    throw new Error(`Embeddings HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const data = json?.data as { embedding: number[] }[] | undefined;
  const reported = readUsage(json?.usage);
  const tokens: TokenUsage = reported
    ? { ...reported, estimated: false }
    : estimatedUsage(texts.reduce((n, t) => n + t.length, 0), 0);
  await recordOk(usage, model, tokens);
  if (!data?.length) throw new Error('Empty embeddings response');
  return data.map((d) => d.embedding);
}

export async function listModels(): Promise<string[]> {
  return fetchModelIds();
}
