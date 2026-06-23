import type { ToolDefinition } from '@/lib/agents/infomaniak-client';
import { SupabaseClient } from '@supabase/supabase-js';
import { COACH_TOOL_DEFINITIONS, executeCoachTool } from '@/lib/agents/tools/coach-tools';
import { REVIEWER_CHAT_TOOL_DEFINITIONS, executeReviewerTool } from '@/lib/agents/tools/reviewer-tools';
import { convertBiographyMode } from '@/lib/echo/biography-mode-convert';

export const ECHO_ONBOARDING_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'confirm_onboarding_step',
      description: 'Record user confirmation for an onboarding step (language, title, privacy, path, terms).',
      parameters: {
        type: 'object',
        properties: {
          step: {
            type: 'string',
            enum: ['language', 'welcome', 'title', 'privacy', 'path', 'terms'],
          },
          value: { type: 'string', description: 'Step value when applicable' },
        },
        required: ['step'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_biography_preferences',
      description: 'Set biography title, privacy, or writing path during onboarding.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          privacy: { type: 'string', enum: ['private', 'link-only', 'public'] },
          writingPath: { type: 'string', enum: ['sections', 'freeflow', 'publish_only'] },
        },
      },
    },
  },
];

export const ECHO_PATH_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'convert_biography_mode',
      description:
        'Convert biography between sections and freeflow without deleting content. Requires user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          toMode: { type: 'string', enum: ['sections', 'freeflow'] },
        },
        required: ['toMode'],
      },
    },
  },
];

export const ECHO_TOOL_DEFINITIONS: ToolDefinition[] = [
  ...ECHO_ONBOARDING_TOOL_DEFINITIONS,
  ...ECHO_PATH_TOOL_DEFINITIONS,
  ...COACH_TOOL_DEFINITIONS,
  ...REVIEWER_CHAT_TOOL_DEFINITIONS.filter(
    (t) => !COACH_TOOL_DEFINITIONS.some((c) => c.function.name === t.function.name)
  ),
];

/** Context-aware tool list — avoids huge tool payloads and enables onboarding without biographyId */
export function getEchoToolsForContext(params: {
  echoPage?: string;
  biographyId?: string;
  onboardingIncomplete?: boolean;
}): ToolDefinition[] {
  const { echoPage, biographyId, onboardingIncomplete } = params;

  if (onboardingIncomplete || echoPage === 'hub' || !biographyId) {
    return [...ECHO_ONBOARDING_TOOL_DEFINITIONS];
  }

  if (echoPage === 'editor_freeflow') {
    return [...ECHO_ONBOARDING_TOOL_DEFINITIONS, ...ECHO_PATH_TOOL_DEFINITIONS, ...COACH_TOOL_DEFINITIONS];
  }

  if (echoPage === 'publication') {
    return [
      ...COACH_TOOL_DEFINITIONS,
      ...REVIEWER_CHAT_TOOL_DEFINITIONS.filter(
        (t) => !COACH_TOOL_DEFINITIONS.some((c) => c.function.name === t.function.name)
      ),
    ];
  }

  return [
    ...ECHO_PATH_TOOL_DEFINITIONS,
    ...COACH_TOOL_DEFINITIONS,
  ];
}

export type EchoToolContext = {
  serviceClient: SupabaseClient;
  userId: string;
  biographyId?: string;
  echoPage?: string;
  biographyMode?: 'sections' | 'freeflow';
};

export type EchoToolResultEvent = {
  tool: string;
  sectionKey?: string;
  contentLength?: number;
  onboardingStep?: string;
  modeConverted?: string;
};

export async function executeEchoTool(
  name: string,
  argsJson: string,
  ctx: EchoToolContext
): Promise<{ content: string; event?: EchoToolResultEvent }> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || '{}');
  } catch {
    return { content: JSON.stringify({ error: 'Invalid JSON arguments' }) };
  }

  if (name === 'confirm_onboarding_step') {
    const step = String(args.step ?? '');
    return {
      content: JSON.stringify({ ok: true, step, value: args.value }),
      event: { tool: name, onboardingStep: step },
    };
  }

  if (name === 'set_biography_preferences') {
    return {
      content: JSON.stringify({
        ok: true,
        title: args.title,
        privacy: args.privacy,
        writingPath: args.writingPath,
      }),
      event: { tool: name },
    };
  }

  if (name === 'convert_biography_mode') {
    if (!ctx.biographyId) {
      return { content: JSON.stringify({ error: 'No biography in context' }) };
    }
    const toMode = args.toMode as 'sections' | 'freeflow';
    const fromMode = ctx.biographyMode ?? 'sections';
    const result = await convertBiographyMode(ctx.serviceClient, ctx.biographyId, fromMode, toMode);
    return {
      content: JSON.stringify(result),
      event: result.ok ? { tool: name, modeConverted: toMode } : undefined,
    };
  }

  if (COACH_TOOL_DEFINITIONS.some((t) => t.function.name === name)) {
    if (!ctx.biographyId) {
      return { content: JSON.stringify({ error: 'biographyId required for coach tools' }) };
    }
    const { content, event } = await executeCoachTool(name, argsJson, {
      serviceClient: ctx.serviceClient,
      userId: ctx.userId,
      biographyId: ctx.biographyId,
    });
    return { content, event };
  }

  if (REVIEWER_CHAT_TOOL_DEFINITIONS.some((t) => t.function.name === name)) {
    if (!ctx.biographyId) {
      return { content: JSON.stringify({ error: 'biographyId required for reviewer tools' }) };
    }
    const { content, event } = await executeReviewerTool(name, argsJson, {
      serviceClient: ctx.serviceClient,
      userId: ctx.userId,
      biographyId: ctx.biographyId,
    });
    return { content, event };
  }

  return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
}
