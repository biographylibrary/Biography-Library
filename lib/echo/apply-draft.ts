import type { SupabaseClient } from '@supabase/supabase-js';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

export const MAX_DRAFT_WORDS = 1500;
const FREEFLOW_SECTION_KEY = 'freeflow';

type BiographyContent = Record<
  string,
  { text?: string; todo?: boolean; audioTranscript?: string }
>;

export function isValidDraftSectionKey(key: string): boolean {
  if (key === FREEFLOW_SECTION_KEY) return true;
  return BIOGRAPHY_SECTIONS.some((s) => s.key === key);
}

export function countDraftWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export async function appendDraftToBiography(
  serviceClient: SupabaseClient,
  userId: string,
  biographyId: string,
  sectionKey: string,
  draftText: string
): Promise<
  | { ok: true; sectionKey: string; appendedWords: number; totalWords: number }
  | { ok: false; error: string }
> {
  const trimmed = draftText.trim();
  if (!isValidDraftSectionKey(sectionKey)) {
    return { ok: false, error: 'Invalid sectionKey' };
  }
  if (!trimmed) {
    return { ok: false, error: 'draftText is required' };
  }

  const words = countDraftWords(trimmed);
  if (words > MAX_DRAFT_WORDS) {
    return {
      ok: false,
      error: `Draft exceeds ${MAX_DRAFT_WORDS} words (${words} provided)`,
    };
  }

  const { data: bio, error: fetchErr } = await serviceClient
    .from('biographies')
    .select('content, content_freeflow')
    .eq('id', biographyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr || !bio) {
    return { ok: false, error: 'Biography not found' };
  }

  if (sectionKey === FREEFLOW_SECTION_KEY) {
    const current = String((bio as { content_freeflow?: string }).content_freeflow ?? '');
    const sep = current && !current.endsWith('\n') ? '\n\n' : '';
    const newText = current + sep + trimmed;

    const { error: updateErr } = await serviceClient
      .from('biographies')
      .update({ content_freeflow: newText })
      .eq('id', biographyId)
      .eq('user_id', userId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    return {
      ok: true,
      sectionKey,
      appendedWords: words,
      totalWords: countDraftWords(newText),
    };
  }

  const content: BiographyContent = {
    ...((bio as { content?: BiographyContent }).content ?? {}),
  };
  const current = content[sectionKey]?.text ?? '';
  const sep = current && !current.endsWith('\n') ? '\n\n' : '';
  const newText = current + sep + trimmed;
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
    return { ok: false, error: updateErr.message };
  }

  return {
    ok: true,
    sectionKey,
    appendedWords: words,
    totalWords: countDraftWords(newText),
  };
}
