import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { embed } from '@/lib/agents/infomaniak-client';
import {
  HELP_KB_SECTIONS,
  KB_LOCALES,
  type KbLocale,
} from '@/lib/agents/kb/help-kb-sections';

const CHUNK_SIZE = 900;

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function splitLongSection(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= CHUNK_SIZE) return [trimmed];
  const parts: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    parts.push(trimmed.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE;
  }
  return parts;
}

function cosineSimilarity(a: number[], b: number[]): number {
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

export type SeedHelpKbResult = {
  indexed: number;
  skipped: number;
  locales: KbLocale[];
};

export async function seedHelpKb(
  serviceClient: SupabaseClient,
  locales: KbLocale[] = [...KB_LOCALES]
): Promise<SeedHelpKbResult> {
  type Pending = {
    locale: KbLocale;
    sourceKey: string;
    chunkIndex: number;
    content: string;
    text_hash: string;
  };

  const pending: Pending[] = [];
  let skipped = 0;

  for (const locale of locales) {
    for (const section of HELP_KB_SECTIONS) {
      const parts = splitLongSection(section.content[locale]);
      for (let chunkIndex = 0; chunkIndex < parts.length; chunkIndex++) {
        const content = parts[chunkIndex];
        const text_hash = hashText(content);

        const { data: existing } = await serviceClient
          .from('kb_chunks')
          .select('text_hash')
          .eq('locale', locale)
          .eq('source_key', section.sourceKey)
          .eq('chunk_index', chunkIndex)
          .maybeSingle();

        if (existing && (existing as { text_hash: string }).text_hash === text_hash) {
          skipped += 1;
          continue;
        }

        pending.push({ locale, sourceKey: section.sourceKey, chunkIndex, content, text_hash });
      }
    }
  }

  if (pending.length === 0) {
    return { indexed: 0, skipped, locales };
  }

  const vectors = await embed(pending.map((p) => p.content));

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i];
    const { error } = await serviceClient.from('kb_chunks').upsert(
      {
        locale: p.locale,
        source_key: p.sourceKey,
        chunk_index: p.chunkIndex,
        content: p.content,
        text_hash: p.text_hash,
        embedding: vectors[i],
      },
      { onConflict: 'locale,source_key,chunk_index' }
    );
    if (error) throw error;
  }

  return { indexed: pending.length, skipped, locales };
}

export async function ensureHelpKbIndexed(
  serviceClient: SupabaseClient,
  locale = 'en'
): Promise<void> {
  const loc = (locale.slice(0, 2) as KbLocale) || 'en';
  const targetLocale = KB_LOCALES.includes(loc as KbLocale) ? (loc as KbLocale) : 'en';

  const { count, error } = await serviceClient
    .from('kb_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('locale', targetLocale);

  if (error) {
    console.warn('[kb-rag] ensureHelpKbIndexed count failed:', error);
    return;
  }
  if ((count ?? 0) === 0) {
    await seedHelpKb(serviceClient, [targetLocale]);
  }
}

export async function retrieveKbContext(
  serviceClient: SupabaseClient,
  query: string,
  locale: string,
  k = 4
): Promise<{ context: string; sources: string[] }> {
  const loc = (locale.slice(0, 2) as KbLocale) || 'en';
  const localesToTry: KbLocale[] = KB_LOCALES.includes(loc as KbLocale)
    ? loc === 'en'
      ? ['en']
      : [loc as KbLocale, 'en']
    : ['en'];

  let queryVec: number[];
  try {
    [queryVec] = await embed([query]);
  } catch {
    return { context: '', sources: [] };
  }

  for (const tryLocale of localesToTry) {
    const { data: chunks, error } = await serviceClient
      .from('kb_chunks')
      .select('source_key, content, embedding')
      .eq('locale', tryLocale);

    if (error || !chunks?.length) continue;

    const scored = chunks
      .map((row) => {
        const r = row as { source_key: string; content: string; embedding: number[] };
        if (!r.embedding?.length) return null;
        return {
          sourceKey: r.source_key,
          content: r.content,
          score: cosineSimilarity(queryVec, r.embedding),
        };
      })
      .filter((x): x is { sourceKey: string; content: string; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    if (!scored.length) continue;

    const sources = Array.from(new Set(scored.map((s) => s.sourceKey)));
    const context = scored.map((s) => `[${s.sourceKey}] ${s.content}`).join('\n---\n');
    return { context, sources };
  }

  return { context: '', sources: [] };
}
