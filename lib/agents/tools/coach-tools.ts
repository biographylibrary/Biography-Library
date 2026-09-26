import { SupabaseClient } from '@supabase/supabase-js';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';
import type { ToolDefinition } from '@/lib/agents/infomaniak-client';
import {
  appendDraftToBiography,
  countDraftWords,
  isValidDraftSectionKey,
  MAX_DRAFT_WORDS,
} from '@/lib/echo/apply-draft';

export { MAX_DRAFT_WORDS };

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
            description: 'Use "freeflow" to read the whole document the author is editing.',
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
        'Change the biography document the author is looking at. ' +
        'To add new prose, set only draftText. ' +
        'To replace a passage, set replaceText to the exact current words and draftText to the new words. ' +
        'To change every occurrence, including a punctuation mark such as a long dash — or –, set replaceAll true. ' +
        'If replaceText is omitted, the text is added at the end. Never do that when the author asked to change existing text. ' +
        'Do not tell them to open the editor.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: {
            type: 'string',
            description: 'Always "freeflow". The biography is one document.',
          },
          draftText: {
            type: 'string',
            description: 'The new wording, or the text to add. For a long dash becoming a comma, this is ", ".',
          },
          replaceText: {
            type: 'string',
            description:
              'The exact current passage to replace, copied from the document. Can be one character, such as —.',
          },
          replaceAll: {
            type: 'boolean',
            description: 'True to replace every occurrence of replaceText, not only the first.',
          },
        },
        required: ['sectionKey', 'draftText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_section',
      description:
        'Mark a biography section as complete when the user says they are done, asks to mark it complete, or confirms the chapter is finished.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: { type: 'string', description: 'Section key to mark complete' },
        },
        required: ['sectionKey'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reopen_section',
      description:
        'Reopen a completed section for editing when the user wants to change it again or asks to mark it as draft/incomplete.',
      parameters: {
        type: 'object',
        properties: {
          sectionKey: { type: 'string', description: 'Section key to reopen' },
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
  /** When true, propose_draft returns preview only (Echo confirms in UI before apply). */
  deferDraftApply?: boolean;
};

export type CoachToolResultEvent = {
  tool: string;
  sectionKey?: string;
  contentLength?: number;
  draftText?: string;
  replaceText?: string;
  replaceAll?: boolean;
  preview?: boolean;
  wordCount?: number;
};

function isValidSectionKey(key: string): boolean {
  return BIOGRAPHY_SECTIONS.some((s) => s.key === key);
}

function countWords(text: string): number {
  return countDraftWords(text);
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
      const readingSheet = sectionKey === 'freeflow';
      if (!readingSheet && !isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }

      if (readingSheet) {
        const { data: bio } = await serviceClient
          .from('biographies')
          .select('content_freeflow')
          .eq('id', biographyId)
          .maybeSingle();
        const full = storedToArchiveMarkdown(
          String((bio as { content_freeflow?: string } | null)?.content_freeflow ?? '')
        );
        const limit = 24_000;
        const text = full.length > limit ? full.slice(0, limit) : full;
        return {
          content: JSON.stringify({
            sectionKey: 'freeflow',
            text,
            truncated: full.length > limit,
            wordCount: countWords(text),
          }),
        };
      }

      const { data: bio } = await serviceClient
        .from('biographies')
        .select('content')
        .eq('id', biographyId)
        .maybeSingle();

      const content = (bio as { content?: BiographyContent } | null)?.content ?? {};
      const sectionText = storedToArchiveMarkdown(content[sectionKey]?.text ?? '');

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
      const replaceText = typeof args.replaceText === 'string' ? args.replaceText : '';
      const replaceAll = args.replaceAll === true;
      const rawDraft = typeof args.draftText === 'string' ? args.draftText : '';
      const draftText = replaceText.trim() ? rawDraft : rawDraft.trim();
      if (!isValidDraftSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }
      if (!draftText.trim()) {
        return { content: JSON.stringify({ error: 'draftText is required' }) };
      }
      if (replaceAll && !replaceText.trim()) {
        return { content: JSON.stringify({ error: 'replaceText is required when replaceAll is true' }) };
      }
      const words = countWords(draftText);
      if (words > MAX_DRAFT_WORDS) {
        return {
          content: JSON.stringify({
            error: `Draft exceeds ${MAX_DRAFT_WORDS} words (${words} provided)`,
          }),
        };
      }

      if (ctx.deferDraftApply) {
        return {
          content: JSON.stringify({
            ok: true,
            preview: true,
            sectionKey,
            draftText,
            ...(replaceText.trim() ? { replaceText } : {}),
            ...(replaceAll ? { replaceAll: true } : {}),
            wordCount: words,
          }),
          event: {
            tool: 'propose_draft',
            sectionKey,
            draftText,
            ...(replaceText.trim() ? { replaceText } : {}),
            ...(replaceAll ? { replaceAll: true } : {}),
            preview: true,
            wordCount: words,
          },
        };
      }

      const applied = await appendDraftToBiography(
        serviceClient,
        userId,
        biographyId,
        sectionKey,
        draftText,
        {
          ...(replaceText.trim() ? { replaceText } : {}),
          ...(replaceAll ? { replaceAll: true } : {}),
        }
      );
      if (!applied.ok) {
        return { content: JSON.stringify({ error: applied.error }) };
      }

      return {
        content: JSON.stringify({
          ok: true,
          sectionKey,
          appendedWords: applied.appendedWords,
          totalWords: applied.totalWords,
        }),
        event: {
          tool: 'propose_draft',
          sectionKey,
          contentLength: applied.totalWords,
        },
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

    case 'reopen_section': {
      const sectionKey = String(args.sectionKey ?? '');
      if (!isValidSectionKey(sectionKey)) {
        return { content: JSON.stringify({ error: 'Invalid sectionKey' }) };
      }

      const { error } = await serviceClient
        .from('section_completions')
        .delete()
        .eq('biography_id', biographyId)
        .eq('section_key', sectionKey);

      if (error) {
        return { content: JSON.stringify({ error: error.message }) };
      }

      return {
        content: JSON.stringify({ ok: true, sectionKey, reopened: true }),
        event: { tool: 'reopen_section', sectionKey },
      };
    }

    default:
      return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}
