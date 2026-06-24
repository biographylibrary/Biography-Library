import { NextRequest } from 'next/server';
import { getBearerJwt, buildUserClient } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import type { AgentType, AgentRole } from '@/lib/agents/models';
import {
  checkAgentRateLimit,
  getOrCreateThread,
  verifyBiographyOwnership,
} from '@/lib/agents/thread-service';
import type { ChatMessage, ToolDefinition } from '@/lib/agents/infomaniak-client';
import { COACH_TOOL_DEFINITIONS } from '@/lib/agents/tools/coach-tools';
import { REVIEWER_CHAT_TOOL_DEFINITIONS } from '@/lib/agents/tools/reviewer-tools';
import { buildCoachSystemPrompt } from '@/lib/agents/prompts/coach';
import { buildPlatformGuideSystemPrompt } from '@/lib/agents/prompts/platform-guide';
import { buildEchoSystemPrompt } from '@/lib/agents/prompts/echo';
import { buildReviewerChatSystemPrompt } from '@/lib/agents/prompts/reviewer';
import { getEchoToolsForContext } from '@/lib/agents/tools/echo-tools';
import { indexBiography, retrieveBiographyContext } from '@/lib/agents/rag/biography-rag';
import {
  ensureHelpKbIndexed,
  retrieveKbContext,
} from '@/lib/agents/rag/kb-rag';
import { buildAgentContext } from '@/lib/agents/thread-memory';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

export type AgentChatRequest = {
  agentType: AgentType;
  message: string;
  biographyId?: string;
  language?: string;
  threadId?: string;
  activeSection?: string;
  echoPage?: 'hub' | 'editor_sections' | 'editor_freeflow' | 'publication' | 'dashboard' | 'other';
  onboardingIncomplete?: boolean;
};

export type AuthResult =
  | { ok: false; status: number; error: string }
  | { ok: true; userId: string; jwt: string };

export type PreparedTurnResult =
  | { ok: false; status: number; error: string; message?: string }
  | {
      ok: true;
      threadId: string;
      history: ChatMessage[];
      userMessage: string;
      locale: string;
      systemPrompt: string;
      role: AgentRole;
      agentType: AgentType;
      tools?: ToolDefinition[];
      biographyId?: string;
      userId: string;
      kbSources?: string[];
      echoPage?: AgentChatRequest['echoPage'];
      biographyMode?: 'sections' | 'freeflow';
    };

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
  if (!agentType || !['platform_guide', 'biography_coach', 'publication_reviewer', 'echo'].includes(agentType)) {
    return { error: 'Invalid agentType' };
  }
  if (!message) return { error: 'message is required' };
  return {
    agentType,
    message,
    biographyId: body?.biographyId as string | undefined,
    language: (body?.language as string | undefined) ?? 'en',
    threadId: body?.threadId as string | undefined,
    activeSection: body?.activeSection as string | undefined,
    echoPage: body?.echoPage as AgentChatRequest['echoPage'],
    onboardingIncomplete: body?.onboardingIncomplete === true,
  };
}

const COACH_SECTIONS_ONLY: Record<string, string> = {
  en: 'The biography coach is only available in section mode. Please switch your biography to section mode to use the writing coach.',
  it: 'Il coach biografico è disponibile solo in modalità a sezioni. Passa alla modalità a sezioni per usare il coach di scrittura.',
  fr: 'Le coach biographique n’est disponible qu’en mode sections. Passez en mode sections pour utiliser le coach d’écriture.',
  de: 'Der Biografie-Coach ist nur im Abschnittsmodus verfügbar. Wechseln Sie in den Abschnittsmodus, um den Schreib-Coach zu nutzen.',
};

const REVIEWER_UNAVAILABLE: Record<string, string> = {
  en: 'The publication reviewer is not available for this biography.',
  it: 'Il revisore di pubblicazione non è disponibile per questa biografia.',
  fr: 'Le réviseur de publication n’est pas disponible pour cette biographie.',
  de: 'Der Publikationsprüfer ist für diese Biografie nicht verfügbar.',
};

const SECTION_TITLE_FALLBACK: Record<string, Record<string, string>> = {
  en: Object.fromEntries(BIOGRAPHY_SECTIONS.map((s) => [s.key, s.title])),
  it: {
    childhood: 'Infanzia e Primi Anni',
    family: 'Famiglia e Origini',
    education: 'Educazione',
    career: 'Carriera e Lavoro',
    'life-events': 'Eventi Importanti',
    relationships: 'Relazioni e Amore',
    challenges: 'Sfide e Lezioni',
    passions: 'Passioni e Hobby',
    legacy: 'Eredità e Riflessioni',
  },
};

function sectionTitleFor(locale: string, sectionKey: string): string {
  const titles = SECTION_TITLE_FALLBACK[locale] ?? SECTION_TITLE_FALLBACK.en;
  return titles[sectionKey] ?? BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey)?.title ?? sectionKey;
}

export async function prepareAgentTurn(
  userId: string,
  payload: AgentChatRequest
): Promise<PreparedTurnResult> {
  const serviceClient = buildServiceClient();
  const locale = (payload.language ?? 'en').slice(0, 2);
  const { agentType, message, biographyId, activeSection } = payload;

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
    if (agentType === 'publication_reviewer' && ownership.biography_mode === 'freeflow') {
      return {
        ok: false,
        status: 400,
        error: 'reviewer_sections_only',
        message: REVIEWER_UNAVAILABLE[locale] ?? REVIEWER_UNAVAILABLE.en,
      };
    }
  }

  const thread = await getOrCreateThread(serviceClient, {
    userId,
    agentType,
    biographyId: biographyId ?? null,
    locale,
  });

  const { history, memoryBlock } = await buildAgentContext(serviceClient, thread);

  if (agentType === 'biography_coach' && biographyId) {
    const sectionKey = activeSection ?? 'childhood';
    if (!BIOGRAPHY_SECTIONS.some((s) => s.key === sectionKey)) {
      return { ok: false, status: 400, error: 'Invalid activeSection' };
    }

    try {
      await indexBiography(serviceClient, biographyId);
    } catch (err) {
      console.warn('[agents] indexBiography failed:', err);
    }

    let ragContext = '';
    try {
      ragContext = await retrieveBiographyContext(serviceClient, biographyId, message, 4);
    } catch (err) {
      console.warn('[agents] retrieveBiographyContext failed:', err);
    }

    const title = sectionTitleFor(locale, sectionKey);
    let systemPrompt = buildCoachSystemPrompt(locale, sectionKey, title);
    if (memoryBlock) {
      systemPrompt += memoryBlock;
    }
    if (ragContext) {
      systemPrompt += `\n\nRelevant excerpts from this biography (for context only):\n${ragContext}`;
    }

    return {
      ok: true,
      threadId: thread.id,
      history,
      userMessage: message,
      locale,
      systemPrompt,
      role: 'coach',
      agentType,
      tools: COACH_TOOL_DEFINITIONS,
      biographyId,
      userId,
    };
  }

  if (agentType === 'publication_reviewer' && biographyId) {
    try {
      await indexBiography(serviceClient, biographyId);
    } catch (err) {
      console.warn('[agents] indexBiography failed:', err);
    }

    let ragContext = '';
    try {
      ragContext = await retrieveBiographyContext(serviceClient, biographyId, message, 4);
    } catch (err) {
      console.warn('[agents] retrieveBiographyContext failed:', err);
    }

    let systemPrompt = buildReviewerChatSystemPrompt(locale);
    if (memoryBlock) {
      systemPrompt += memoryBlock;
    }
    if (ragContext) {
      systemPrompt += `\n\nRelevant excerpts from this biography:\n${ragContext}`;
    }

    return {
      ok: true,
      threadId: thread.id,
      history,
      userMessage: message,
      locale,
      systemPrompt,
      role: 'reviewer',
      agentType,
      tools: REVIEWER_CHAT_TOOL_DEFINITIONS,
      biographyId,
      userId,
    };
  }

  if (agentType === 'echo') {
    const echoPage = payload.echoPage ?? 'hub';
    let biographyMode: 'sections' | 'freeflow' | undefined;
    let publicationStatus: string | undefined;

    if (biographyId) {
      const ownership = await verifyBiographyOwnership(serviceClient, biographyId, userId);
      if (!ownership.ok) {
        return { ok: false, status: 403, error: 'Forbidden' };
      }
      biographyMode = ownership.biography_mode as 'sections' | 'freeflow' | undefined;
      publicationStatus = ownership.status;

      try {
        await indexBiography(serviceClient, biographyId);
      } catch (err) {
        console.warn('[agents] indexBiography failed:', err);
      }
    }

    let ragContext = '';
    let kbContext = '';
    let kbSources: string[] = [];

    if (biographyId && message) {
      try {
        ragContext = await retrieveBiographyContext(serviceClient, biographyId, message, 4);
      } catch (err) {
        console.warn('[agents] retrieveBiographyContext failed:', err);
      }
    }

    try {
      await ensureHelpKbIndexed(serviceClient, locale);
      const kb = await retrieveKbContext(serviceClient, message, locale, 4);
      kbContext = kb.context;
      kbSources = kb.sources;
    } catch (err) {
      console.warn('[agents] kb retrieve failed:', err);
    }

    let systemPrompt = buildEchoSystemPrompt(locale, {
      page: echoPage,
      biographyMode,
      publicationStatus,
      onboardingIncomplete: payload.onboardingIncomplete,
    });

    if (memoryBlock) {
      systemPrompt += memoryBlock;
    }

    if (ragContext) {
      systemPrompt += `\n\nRelevant biography excerpts:\n${ragContext}`;
    }
    if (kbContext) {
      systemPrompt += `\n\nKnowledge base excerpts:\n${kbContext}`;
    }

    if (echoPage === 'editor_sections' && biographyId && activeSection) {
      const title = sectionTitleFor(locale, activeSection);
      systemPrompt +=
        `\n\n=== ACTIVE SECTION (mandatory) ===\n` +
        `The author is currently on chapter: "${title}" (sectionKey: ${activeSection}).\n` +
        `They selected this chapter in the sidebar — do NOT ask which chapter to work on.\n` +
        `All coaching, questions, and drafts must focus on "${title}" unless they explicitly request another section.\n` +
        `When using propose_draft, use sectionKey: ${activeSection}.\n` +
        `=== END ACTIVE SECTION ===`;
    }

    return {
      ok: true,
      threadId: thread.id,
      history,
      userMessage: message,
      locale,
      systemPrompt,
      role: 'onboarding',
      agentType,
      tools: getEchoToolsForContext({
        echoPage,
        biographyId,
        onboardingIncomplete: payload.onboardingIncomplete,
      }),
      biographyId,
      userId,
      kbSources,
      echoPage,
      biographyMode,
    };
  }

  const systemPrompt = buildPlatformGuideSystemPrompt(locale);

  try {
    await ensureHelpKbIndexed(serviceClient, locale);
  } catch (err) {
    console.warn('[agents] ensureHelpKbIndexed failed:', err);
  }

  let kbContext = '';
  let kbSources: string[] = [];
  try {
    const kb = await retrieveKbContext(serviceClient, message, locale, 4);
    kbContext = kb.context;
    kbSources = kb.sources;
  } catch (err) {
    console.warn('[agents] retrieveKbContext failed:', err);
  }

  let fullSystemPrompt = systemPrompt;
  if (memoryBlock) {
    fullSystemPrompt += memoryBlock;
  }
  if (kbContext) {
    fullSystemPrompt += `\n\nRelevant knowledge base excerpts:\n${kbContext}`;
  }

  return {
    ok: true,
    threadId: thread.id,
    history,
    userMessage: message,
    locale,
    systemPrompt: fullSystemPrompt,
    role: 'onboarding',
    agentType,
    userId,
    kbSources,
  };
}

export function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
