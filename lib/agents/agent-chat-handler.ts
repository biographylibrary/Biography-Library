import { NextRequest } from 'next/server';
import { getBearerJwt, buildUserClient } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import type { AgentType } from '@/lib/agents/models';
import {
  checkAgentRateLimit,
  getOrCreateThread,
  loadThreadMessages,
  verifyBiographyOwnership,
} from '@/lib/agents/thread-service';
import type { ChatMessage } from '@/lib/agents/infomaniak-client';

export type AgentChatRequest = {
  agentType: AgentType;
  message: string;
  biographyId?: string;
  language?: string;
  threadId?: string;
};

export type AuthResult =
  | { ok: false; status: number; error: string }
  | { ok: true; userId: string; jwt: string };

export async function authenticateAgentRequest(req: NextRequest): Promise<AuthResult> {
  const jwt = getBearerJwt(req);
  if (!jwt) return { ok: false, status: 401, error: 'Authentication required' };

  const userClient = buildUserClient(jwt);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) return { ok: false, status: 401, error: 'Authentication required' };

  return { ok: true, userId: user.id, jwt };
}

export async function parseAgentChatBody(req: NextRequest): Promise<AgentChatRequest | { error: string }> {
  const body = await req.json();
  const agentType = body?.agentType as AgentType | undefined;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!agentType || !['platform_guide', 'biography_coach', 'publication_reviewer'].includes(agentType)) {
    return { error: 'Invalid agentType' };
  }
  if (!message) return { error: 'message is required' };
  return {
    agentType,
    message,
    biographyId: body?.biographyId as string | undefined,
    language: (body?.language as string | undefined) ?? 'en',
    threadId: body?.threadId as string | undefined,
  };
}

const COACH_SECTIONS_ONLY: Record<string, string> = {
  en: 'The biography coach is only available in section mode. Please switch your biography to section mode to use the writing coach.',
  it: 'Il coach biografico è disponibile solo in modalità a sezioni. Passa alla modalità a sezioni per usare il coach di scrittura.',
  fr: 'Le coach biographique n’est disponible qu’en mode sections. Passez en mode sections pour utiliser le coach d’écriture.',
  de: 'Der Biografie-Coach ist nur im Abschnittsmodus verfügbar. Wechseln Sie in den Abschnittsmodus, um den Schreib-Coach zu nutzen.',
};

const NOT_IMPLEMENTED: Record<string, string> = {
  en: 'This agent is not available yet. Please try again later.',
  it: 'Questo agente non è ancora disponibile. Riprova più tardi.',
  fr: 'Cet agent n’est pas encore disponible. Réessayez plus tard.',
  de: 'Dieser Agent ist noch nicht verfügbar. Bitte versuchen Sie es später erneut.',
};

export async function prepareAgentTurn(
  userId: string,
  payload: AgentChatRequest
): Promise<
  | { ok: false; status: number; error: string; message?: string }
  | {
      ok: true;
      threadId: string;
      history: ChatMessage[];
      userMessage: string;
      locale: string;
      systemPrompt: string;
      role: 'onboarding' | 'coach' | 'reviewer';
    }
> {
  const serviceClient = buildServiceClient();
  const locale = (payload.language ?? 'en').slice(0, 2);
  const { agentType, message, biographyId } = payload;

  const rate = await checkAgentRateLimit(serviceClient, userId);
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      error: rate.reason === 'burst' ? 'rate_limit_burst' : 'rate_limit_daily',
    };
  }

  if (agentType === 'biography_coach' || agentType === 'publication_reviewer') {
    if (!biographyId) {
      return { ok: false, status: 400, error: 'biographyId is required' };
    }
    const ownership = await verifyBiographyOwnership(serviceClient, biographyId, userId);
    if (!ownership.ok) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    if (agentType === 'biography_coach' && ownership.biography_mode !== 'sections') {
      return {
        ok: false,
        status: 400,
        error: 'sections_mode_required',
        message: COACH_SECTIONS_ONLY[locale] ?? COACH_SECTIONS_ONLY.en,
      };
    }
  }

  if (agentType === 'biography_coach' || agentType === 'publication_reviewer') {
    return {
      ok: false,
      status: 501,
      error: 'not_implemented',
      message: NOT_IMPLEMENTED[locale] ?? NOT_IMPLEMENTED.en,
    };
  }

  const thread = await getOrCreateThread(serviceClient, {
    userId,
    agentType,
    biographyId: biographyId ?? null,
    locale,
  });

  const rows = await loadThreadMessages(serviceClient, thread.id);
  const history: ChatMessage[] = rows.map((r) => ({
    role: r.role,
    content: r.content,
  }));

  const { buildPlatformGuideSystemPrompt } = await import('@/lib/agents/prompts/platform-guide');
  const systemPrompt = buildPlatformGuideSystemPrompt(locale);

  return {
    ok: true,
    threadId: thread.id,
    history,
    userMessage: message,
    locale,
    systemPrompt,
    role: 'onboarding',
  };
}

export function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
