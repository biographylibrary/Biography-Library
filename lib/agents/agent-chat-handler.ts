import { NextRequest } from 'next/server';
import { getBearerJwt, buildUserClient } from '@/lib/server/admin-api-auth';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { checkAuthorTokenCap, tokenCapResponseBody } from '@/lib/ai/token-caps';
import { isPlatformStaffRole } from '@/lib/server/staff-roles';
import type { UserRole } from '@/lib/auth-context';
import type { AgentType, AgentRole } from '@/lib/agents/models';
import {
  checkAgentRateLimit,
  getOrCreateThread,
  verifyBiographyOwnership,
} from '@/lib/agents/thread-service';
import type { ChatMessage, ToolDefinition } from '@/lib/agents/infomaniak-client';
import { buildEchoSystemPrompt } from '@/lib/agents/prompts/echo';
import { getEchoToolsForContext } from '@/lib/agents/tools/echo-tools';
import { indexBiography, retrieveBiographyContext } from '@/lib/agents/rag/biography-rag';
import {
  ensureHelpKbIndexed,
  retrieveKbContext,
} from '@/lib/agents/rag/kb-rag';
import { buildAgentContext } from '@/lib/agents/thread-memory';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import {
  buildMemorialNarrativeBlock,
  isMemorialNarrative,
  type BiographyNarrativeContext,
} from '@/lib/biography-narrative-context';

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
  | {
      ok: false;
      status: number;
      error: string;
      message?: string;
      period?: string;
      resetsAt?: string;
      limit?: number;
      used?: number;
    }
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
  if (agentType !== 'echo') {
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

function appendMemorialBlock(systemPrompt: string, narrative: BiographyNarrativeContext | undefined, locale: string): string {
  if (!narrative || !isMemorialNarrative(narrative)) return systemPrompt;
  return systemPrompt + buildMemorialNarrativeBlock(narrative, locale);
}

export async function prepareAgentTurn(
  userId: string,
  payload: AgentChatRequest
): Promise<PreparedTurnResult> {
  const serviceClient = buildServiceClient();
  const locale = (payload.language ?? 'en').slice(0, 2);
  const { agentType, message, biographyId, activeSection } = payload;

  const { data: staffProfile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const skipRateLimit = isPlatformStaffRole(staffProfile?.role as UserRole | undefined);

  const rate = await checkAgentRateLimit(serviceClient, userId, { skip: skipRateLimit });
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      error: rate.reason === 'burst' ? 'rate_limit_burst' : 'rate_limit_daily',
    };
  }

  const cap = await checkAuthorTokenCap(serviceClient, userId, { isStaff: skipRateLimit });
  if (!cap.allowed) {
    const body = tokenCapResponseBody(cap, payload.language);
    return { ok: false, status: 429, ...body };
  }

  const echoPage = payload.echoPage ?? 'hub';
  let biographyMode: 'sections' | 'freeflow' | undefined;
  let publicationStatus: string | undefined;
  let narrative: BiographyNarrativeContext | undefined;

  if (biographyId) {
    const ownership = await verifyBiographyOwnership(serviceClient, biographyId, userId);
    if (!ownership.ok) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
    if (ownership.isEdition) {
      return { ok: false, status: 403, error: 'echo_not_available_for_edition' };
    }
    biographyMode = ownership.biography_mode as 'sections' | 'freeflow' | undefined;
    publicationStatus = ownership.status;
    narrative = ownership.narrative;
  }

  const thread = await getOrCreateThread(serviceClient, {
    userId,
    agentType,
    biographyId: biographyId ?? null,
    locale,
  });

  const { history, memoryBlock } = await buildAgentContext(serviceClient, thread);

  if (biographyId) {
    try {
      await indexBiography(serviceClient, biographyId, userId);
    } catch (err) {
      console.warn('[agents] indexBiography failed:', err);
    }
  }

  let ragContext = '';
  let kbContext = '';
  let kbSources: string[] = [];

  if (biographyId && message) {
    try {
      ragContext = await retrieveBiographyContext(serviceClient, biographyId, message, 4, userId);
    } catch (err) {
      console.warn('[agents] retrieveBiographyContext failed:', err);
    }
  }

  try {
    await ensureHelpKbIndexed(serviceClient, locale, userId);
    const kb = await retrieveKbContext(serviceClient, message, locale, 4, userId);
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
    narrative,
  });

  systemPrompt = appendMemorialBlock(systemPrompt, narrative, locale);

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
    const writerLabel =
      narrative && isMemorialNarrative(narrative)
        ? `The writer (${narrative.writerName || 'author'}) is documenting ${narrative.subjectName}`
        : 'The author';
    systemPrompt +=
      `\n\n=== ACTIVE SECTION (mandatory) ===\n` +
      `${writerLabel} is currently on chapter: "${title}" (sectionKey: ${activeSection}).\n` +
      `They selected this chapter in the sidebar — do NOT ask which chapter to work on.\n` +
      `All coaching, questions, and drafts must focus on "${title}" unless they explicitly request another section.\n` +
      `When using propose_draft, use sectionKey "freeflow". To change existing words, set replaceText to the exact passage and draftText to the new wording. Set replaceAll true to change every occurrence, such as every long dash. If you omit replaceText, the text is only added at the end.\n` +
      `=== END ACTIVE SECTION ===`;
  }

  const echoRole: AgentRole =
    echoPage === 'editor_sections' ||
    echoPage === 'editor_freeflow' ||
    echoPage === 'publication'
      ? 'coach'
      : 'onboarding';

  return {
    ok: true,
    threadId: thread.id,
    history,
    userMessage: message,
    locale,
    systemPrompt,
    role: echoRole,
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

export function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
