import { SupabaseClient } from '@supabase/supabase-js';
import { BIOGRAPHY_SECTIONS, type BiographyContent } from '@/lib/editor-constants';
import { storedToArchiveMarkdown, storedToPlainText } from '@/lib/archive-markdown';

export async function sectionsToFreeflow(
  serviceClient: SupabaseClient,
  biographyId: string
): Promise<string> {
  const { data: sections } = await serviceClient
    .from('biography_sections')
    .select('section_key, content')
    .eq('biography_id', biographyId)
    .order('section_key');

  const parts: string[] = [];
  for (const s of sections ?? []) {
    const title =
      BIOGRAPHY_SECTIONS.find((b) => b.key === s.section_key)?.title ?? s.section_key;
    const text = storedToArchiveMarkdown(s.content ?? '');
    if (text.trim()) {
      parts.push(`## ${title}\n\n${text}`);
    }
  }
  return parts.join('\n');
}

export async function convertBiographyMode(
  serviceClient: SupabaseClient,
  biographyId: string,
  fromMode: 'sections' | 'freeflow',
  toMode: 'sections' | 'freeflow'
): Promise<{ ok: boolean; error?: string }> {
  if (fromMode === toMode) return { ok: true };

  const { data: bio, error: fetchErr } = await serviceClient
    .from('biographies')
    .select('content, content_freeflow, biography_mode')
    .eq('id', biographyId)
    .maybeSingle();

  if (fetchErr || !bio) return { ok: false, error: 'Biography not found' };

  if (fromMode === 'sections' && toMode === 'freeflow') {
    const html = await sectionsToFreeflow(serviceClient, biographyId);
    const { error } = await serviceClient
      .from('biographies')
      .update({
        biography_mode: 'freeflow',
        content_freeflow: html || (bio as { content_freeflow?: string }).content_freeflow || '',
      })
      .eq('id', biographyId);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  if (fromMode === 'freeflow' && toMode === 'sections') {
    const freeflow = (bio as { content_freeflow?: string }).content_freeflow ?? '';
    const markdown = storedToArchiveMarkdown(freeflow);
    if (storedToPlainText(markdown).trim()) {
      const firstKey = BIOGRAPHY_SECTIONS[0]?.key ?? 'childhood';
      const content = (bio as { content?: BiographyContent }).content ?? {};
      const updated = {
        ...content,
        [firstKey]: {
          ...(content[firstKey] ?? { text: '', todo: false, audioTranscript: '' }),
          text: markdown,
        },
      };
      const { error } = await serviceClient
        .from('biographies')
        .update({ biography_mode: 'sections', content: updated })
        .eq('id', biographyId);
      return error ? { ok: false, error: error.message } : { ok: true };
    }
    const { error } = await serviceClient
      .from('biographies')
      .update({ biography_mode: 'sections' })
      .eq('id', biographyId);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  return { ok: false, error: 'Unsupported conversion' };
}
