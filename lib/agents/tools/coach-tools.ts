import { SupabaseClient } from '@supabase/supabase-js';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { ToolDefinition } from '@/lib/agents/infomaniak-client';

const MAX_DRAFT_WORDS = 1500;

export const COACH_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_progress',
      description: 'Get biography writing progress: completed section keys and counts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_section',
      description: 'Read the current text and workflow status for a biography section.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: {
            type: 'string',
            description: 'Section key, e.g. childhood, family, career',
          },
        },
        required: ['sectionKey'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_draft',
      description:
        'Append draft narrative text to a section in the biography editor. Only when the user explicitly asked for a written draft.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: { type: 'string', description: 'Target section key' },
          draftText: { type: 'string', description: 'Prose to append to the section' },
        },
        required: ['sectionKey', 'draftText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_section',
      description: 'Mark a section as complete after the user confirms they are finished with it.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: { type: 'string', description: 'Section key to mark complete' },
        },
        required: ['sectionKey'],
      },
    },
  },
];

export type CoachToolContext = {
  serviceClient: SupabaseClient;
  userId: string;
  biographyId: string;
};

export type CoachToolResultEvent = {
  tool: string;
  sectionKey?: string;
  contentLength?: number;
};

function isValidSectionKey(key: string): boolean {
  return BIOGRAPHY_SECTIONS.some((s) => s.key === key);
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function parseArgs(argsJson: string): Record<string, unknown> {
  try {
    return JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type BiographyContent = Record<string, { text?: string; todo?: boolean; audioTranscript?: string }>;

export async function executeCoachTool(
  name: string,
  argsJson: string,
  ctx: CoachToolContext
): Promise<{ content: string; event?: CoachToolResultEvent }> {
  const args = parseArgs(argsJson);
  const { serviceClient, userId, biographyId } = ctx;

  switch (name) {
    case 'get_progress': {
      const { data: rows } = await serviceClient
        .from('section_completions')
        .select('section_key')
        .eq('biography_id', biographyId);

      const completed = (rows ?? []).map((r) => (r as { section_key: string }).section_key);
      const total = BIOGRAPHY_SECTIONS.length;
      return {
        content: JSON.stringify({
          completedSections: completed,
          completedCount: completed.length,
          totalSections: total,
          percentComplete: Math.round((completed.length / total) * 100),
        }),
      };
    }

    case 'read_section': {
      const sectionKey = String(args.sectionKey ?? '');
      if (!isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }

      const { data: bio } = await serviceClient
        .from('biographies')
        .select('content')
        .eq('id', biographyId)
        .maybeSingle();

      const content = (bio as { content?: BiographyContent } | null)?.content ?? {};
      const sectionText = content[sectionKey]?.text ?? '';

      const { data: statusRow } = await serviceClient
        .from('biography_sections')
        .select('status, draft_version')
        .eq('biography_id', biographyId)
        .eq('section_key', sectionKey)
        .maybeSingle();

      const completed = await serviceClient
        .from('section_completions')
        .select('section_key')
        .eq('biography_id', biographyId)
        .eq('section_key', sectionKey)
        .maybeSingle();

      return {
        content: JSON.stringify({
          sectionKey,
          text: sectionText,
          wordCount: countWords(sectionText),
          status: (statusRow as { status?: string } | null)?.status ?? 'in_progress',
          isComplete: !!completed.data,
        }),
      };
    }

    case 'propose_draft': {
      const sectionKey = String(args.sectionKey ?? '');
      const draftText = String(args.draftText ?? '').trim();
      if (!isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }
      if (!draftText) {
        return { content: JSON.stringify({ error: 'draftText is required' }) };
      }
      const words = countWords(draftText);
      if (words > MAX_DRAFT_WORDS) {
        return {
          content: JSON.stringify({
            error: `Draft exceeds ${MAX_DRAFT_WORDS} words (${words} provided)`,
          }),
        };
      }

      const { data: bio, error: fetchErr } = await serviceClient
        .from('biographies')
        .select('content')
        .eq('id', biographyId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchErr || !bio) {
        return { content: JSON.stringify({ error: 'Biography not found' }) };
      }

      const content: BiographyContent = {
        ...((bio as { content?: BiographyContent }).content ?? {}),
      };
      const current = content[sectionKey]?.text ?? '';
      const sep = current && !current.endsWith('\n') ? '\n\n' : '';
      const newText = current + sep + draftText;
      content[sectionKey] = {
        ...(content[sectionKey] ?? { todo: false, audioTranscript: '' }),
        text: newText,
      };

      const { error: updateErr } = await serviceClient
        .from('biographies')
        .update({ content })
        .eq('id', biographyId)
        .eq('user_id', userId);

      if (updateErr) {
        return { content: JSON.stringify({ error: updateErr.message }) };
      }

      return {
        content: JSON.stringify({
          ok: true,
          sectionKey,
          appendedWords: words,
          totalWords: countWords(newText),
        }),
        event: { tool: 'propose_draft', sectionKey, contentLength: newText.length },
      };
    }

    case 'complete_section': {
      const sectionKey = String(args.sectionKey ?? '');
      if (!isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }

      const { error } = await serviceClient.from('section_completions').upsert(
        {
          user_id: userId,
          biography_id: biographyId,
          section_key: sectionKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'biography_id,section_key' }
      );

      if (error) {
        return { content: JSON.stringify({ error: error.message }) };
      }

      return {
        content: JSON.stringify({ ok: true, sectionKey, markedComplete: true }),
        event: { tool: 'complete_section', sectionKey },
      };
    }

    default:
      return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}
