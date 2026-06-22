/**
 * Agent model registry — single source of truth for Infomaniak model slugs.
 * Slugs verified via GET {INFOMANIAK_AI_BASE_URL}/models (product 107001, 2026-06).
 */

export type AgentRole =
  | 'coach'
  | 'reviewer'
  | 'onboarding'
  | 'apertus'
  | 'embedding';

export type AgentType = 'platform_guide' | 'biography_coach' | 'publication_reviewer';

export const AGENT_TYPE_TO_ROLE: Record<AgentType, AgentRole> = {
  platform_guide: 'onboarding',
  biography_coach: 'coach',
  publication_reviewer: 'reviewer',
};

/** bge_multilingual_gemma2 — verified 3584 dims via POST /embeddings (product 107001, 2026-06) */
export const EMBEDDING_DIMENSIONS = 3584;

export const DEFAULT_MODELS: Record<AgentRole, { primary: string; fallback: string }> = {
  coach: {
    primary: 'google/gemma-4-31B-it',
    fallback: 'mistralai/Mistral-Small-4-119B-2603',
  },
  reviewer: {
    primary: 'google/gemma-4-31B-it',
    fallback: 'mistralai/Mistral-Small-4-119B-2603',
  },
  onboarding: {
    primary: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8',
    fallback: 'mistralai/Ministral-3-14B-Instruct-2512',
  },
  apertus: {
    primary: 'swiss-ai/Apertus-70B-Instruct-2509',
    fallback: 'mistralai/Mistral-Small-4-119B-2603',
  },
  embedding: {
    primary: 'bge_multilingual_gemma2',
    fallback: 'bge_multilingual_gemma2',
  },
};

const ENV_KEYS: Record<AgentRole, { primary: string; fallback: string }> = {
  coach: { primary: 'AGENT_MODEL_COACH', fallback: 'AGENT_MODEL_COACH_FALLBACK' },
  reviewer: { primary: 'AGENT_MODEL_REVIEWER', fallback: 'AGENT_MODEL_REVIEWER_FALLBACK' },
  onboarding: { primary: 'AGENT_MODEL_ONBOARDING', fallback: 'AGENT_MODEL_ONBOARDING_FALLBACK' },
  apertus: { primary: 'AGENT_MODEL_APERTUS', fallback: 'AGENT_MODEL_APERTUS_FALLBACK' },
  embedding: { primary: 'AGENT_EMBEDDING_MODEL', fallback: 'AGENT_EMBEDDING_MODEL_FALLBACK' },
};

export interface ModelParams {
  max_tokens: number;
  temperature: number;
  /** Some Infomaniak models reject extra fields */
  supportsThinking: boolean;
}

const MODEL_PARAMS: Record<AgentRole, ModelParams> = {
  coach: { max_tokens: 2048, temperature: 0.7, supportsThinking: false },
  reviewer: { max_tokens: 2048, temperature: 0.2, supportsThinking: false },
  onboarding: { max_tokens: 1024, temperature: 0.5, supportsThinking: false },
  apertus: { max_tokens: 2048, temperature: 0.3, supportsThinking: false },
  embedding: { max_tokens: 0, temperature: 0, supportsThinking: false },
};

export function getModelForRole(role: AgentRole): { primary: string; fallback: string } {
  const defaults = DEFAULT_MODELS[role];
  const keys = ENV_KEYS[role];
  return {
    primary: process.env[keys.primary] ?? defaults.primary,
    fallback: process.env[keys.fallback] ?? defaults.fallback,
  };
}

export function getModelParams(role: AgentRole): ModelParams {
  return MODEL_PARAMS[role];
}

export function getModelsForAgentType(agentType: AgentType): { primary: string; fallback: string } {
  return getModelForRole(AGENT_TYPE_TO_ROLE[agentType]);
}

let cachedModelIds: Set<string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function listAvailableModelIds(
  fetchModels: () => Promise<string[]>
): Promise<Set<string>> {
  const now = Date.now();
  if (cachedModelIds && now < cacheExpiry) return cachedModelIds;
  const ids = await fetchModels();
  cachedModelIds = new Set(ids);
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedModelIds;
}

export function resolveInfomaniakBaseUrl(): string {
  const explicit = process.env.INFOMANIAK_AI_BASE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const endpoint = process.env.INFOMANIAK_AI_ENDPOINT ?? '';
  return endpoint.replace(/\/chat\/completions\/?$/, '');
}
