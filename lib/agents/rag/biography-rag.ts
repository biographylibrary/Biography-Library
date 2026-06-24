import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { embed } from '@/lib/agents/infomaniak-client';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

const CHUNK_SIZE = 800;

type BiographyContent = Record<string, { text?: string }>;

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function chunkText(text: string, sectionKey: string): { sectionKey: string; index: number; content: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const chunks: { sectionKey: string; index: number; content: string }[] = [];
  let start = 0;
  let index = 0;
  while (start < trimmed.length) {
    const slice = trimmed.slice(start, start + CHUNK_SIZE);
    chunks.push({ sectionKey, index, content: slice });
    start += CHUNK_SIZE;
    index += 1;
  }
  return chunks;
}

export async function indexBiography(
  serviceClient: SupabaseClient,
  biographyId: string
): Promise<{ indexed: number; skipped: boolean }> {
  const { data: bio, error } = await serviceClient
    .from('biographies')
    .select('content, biography_mode')
    .eq('id', biographyId)
    .maybeSingle();

  if (error || !bio) return { indexed: 0, skipped: true };
  if ((bio as { biography_mode?: string }).biography_mode !== 'sections') {
    return { indexed: 0, skipped: true };
  }

  const content = (bio as { content?: BiographyContent }).content ?? {};
  const allChunks: { sectionKey: string; index: number; content: string; text_hash: string }[] = [];

  for (const section of BIOGRAPHY_SECTIONS) {
    const text = content[section.key]?.text ?? '';
    for (const c of chunkText(text, section.key)) {
      allChunks.push({
        ...c,
        text_hash: hashText(c.content),
      });
    }
  }

  if (allChunks.length === 0) {
    await serviceClient.from('biography_chunks').delete().eq('biography_id', biographyId);
    return { indexed: 0, skipped: false };
  }

  const { data: existing } = await serviceClient
    .from('biography_chunks')
    .select('section_key, chunk_index, text_hash')
    .eq('biography_id', biographyId);

  const existingMap = new Map(
    (existing ?? []).map((r) => {
      const row = r as { section_key: string; chunk_index: number; text_hash: string };
      return [`${row.section_key}:${row.chunk_index}`, row.text_hash];
    })
  );

  const toEmbed = allChunks.filter((c) => {
    const key = `${c.sectionKey}:${c.index}`;
    return existingMap.get(key) !== c.text_hash;
  });

  if (toEmbed.length === 0) {
    return { indexed: 0, skipped: false };
  }

  const vectors = await embed(toEmbed.map((c) => c.content));

  for (let i = 0; i < toEmbed.length; i++) {
    const c = toEmbed[i];
    await serviceClient.from('biography_chunks').upsert(
      {
        biography_id: biographyId,
        section_key: c.sectionKey,
        chunk_index: c.index,
        content: c.content,
        text_hash: c.text_hash,
        embedding: vectors[i],
      },
      { onConflict: 'biography_id,section_key,chunk_index' }
    );
  }

  return { indexed: toEmbed.length, skipped: false };
}

export async function retrieveBiographyContext(
  serviceClient: SupabaseClient,
  biographyId: string,
  query: string,
  k = 4
): Promise<string> {
  const { data: chunks, error } = await serviceClient
    .from('biography_chunks')
    .select('section_key, content, embedding')
    .eq('biography_id', biographyId);

  if (error || !chunks?.length) return '';

  let queryVec: number[];
  try {
    [queryVec] = await embed([query]);
  } catch {
    return '';
  }

  function cosine(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  const scored = chunks
    .map((row) => {
      const r = row as { section_key: string; content: string; embedding: number[] };
      const emb = r.embedding;
      if (!emb?.length) return null;
      return { sectionKey: r.section_key, content: r.content, score: cosine(queryVec, emb) };
    })
    .filter((x): x is { sectionKey: string; content: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (!scored.length) return '';

  return scored.map((s) => `[${s.sectionKey}] ${s.content}`).join('\n---\n');
}
