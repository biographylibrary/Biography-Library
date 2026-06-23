import { SupabaseClient } from '@supabase/supabase-js';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { ToolDefinition } from '@/lib/agents/infomaniak-client';

export const SCREENING_VERDICT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'submit_screening_verdict',
    description:
      'Submit structured pre-publication screening verdict with flagged passages and overall severity.',
    parameters: {
      type: 'object',
      properties: {
        passages: {
          type: 'array',
          description: 'Flagged passages; empty if content is clean',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Exact problematic sentence, max 400 chars' },
              section_key: { type: 'string', description: 'Section key e.g. childhood, freeflow' },
              reason: { type: 'string', description: 'Brief reason, max 150 chars' },
              severity: { type: 'integer', description: '1 minor, 2 moderate, 3 serious' },
            },
            required: ['text', 'section_key', 'reason', 'severity'],
          },
        },
        overall_severity: {
          type: 'integer',
          description: 'Max severity across passages, or 0 if none',
        },
        summary: {
          type: 'string',
          description: 'One or two sentence summary for moderators',
        },
      },
      required: ['passages', 'overall_severity', 'summary'],
    },
  },
};

export const REVIEWER_CHAT_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_section',
      description: 'Read text and status for a biography section.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: { type: 'string', description: 'Section key e.g. childhood, family' },
        },
        required: ['sectionKey'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_publication_status',
      description: 'Get biography workflow status and AI screening status.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

export type ReviewerToolContext = {
  serviceClient: SupabaseClient;
  userId: string;
  biographyId: string;
};

export type ReviewerToolResultEvent = {
  tool: string;
  sectionKey?: string;
};

type BiographyContent = Record<string, { text?: string }>;

function isValidSectionKey(key: string): boolean {
  return key === 'freeflow' || BIOGRAPHY_SECTIONS.some((s) => s.key === key);
}

function parseArgs(argsJson: string): Record<string, unknown> {
  try {
    return JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export async function executeReviewerTool(
  name: string,
  argsJson: string,
  ctx: ReviewerToolContext
): Promise<{ content: string; event?: ReviewerToolResultEvent }> {
  const args = parseArgs(argsJson);
  const { serviceClient, biographyId } = ctx;

  switch (name) {
    case 'read_section': {
      const sectionKey = String(args.sectionKey ?? '');
      if (!isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }

      const { data: bio } = await serviceClient
        .from('biographies')
        .select('content, content_freeflow, biography_mode')
        .eq('id', biographyId)
        .maybeSingle();

      let sectionText = '';
      if (sectionKey === 'freeflow') {
        sectionText = (bio as { content_freeflow?: string } | null)?.content_freeflow ?? '';
      } else {
        const content = (bio as { content?: BiographyContent } | null)?.content ?? {};
        sectionText = content[sectionKey]?.text ?? '';
      }

      const { data: statusRow } = await serviceClient
        .from('biography_sections')
        .select('status')
        .eq('biography_id', biographyId)
        .eq('section_key', sectionKey)
        .maybeSingle();

      return {
        content: JSON.stringify({
          sectionKey,
          text: sectionText.slice(0, 4000),
          wordCount: countWords(sectionText),
          status: (statusRow as { status?: string } | null)?.status ?? 'in_progress',
        }),
        event: { tool: 'read_section', sectionKey },
      };
    }

    case 'get_publication_status': {
      const { data: bio } = await serviceClient
        .from('biographies')
        .select('status, ai_screening_status, biography_mode, published_at')
        .eq('id', biographyId)
        .maybeSingle();

      const { count: completedCount } = await serviceClient
        .from('section_completions')
        .select('*', { count: 'exact', head: true })
        .eq('biography_id', biographyId);

      const row = bio as {
        status?: string;
        ai_screening_status?: string;
        biography_mode?: string;
        published_at?: string | null;
      } | null;

      return {
        content: JSON.stringify({
          status: row?.status ?? 'draft',
          aiScreeningStatus: row?.ai_screening_status ?? null,
          biographyMode: row?.biography_mode ?? 'sections',
          publishedAt: row?.published_at ?? null,
          completedSections: completedCount ?? 0,
          totalSections: BIOGRAPHY_SECTIONS.length,
        }),
      };
    }

    default:
      return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}
