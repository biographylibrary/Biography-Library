import { chat } from '@/lib/agents/infomaniak-client';
import {
  CHUNK_AI_TIMEOUT_MS,
  SCREENING_CHUNK_CONCURRENCY,
  SCREENING_RETRY_BASE_DELAY_MS,
  SCREENING_SAME_MODEL_RETRIES,
} from '@/lib/agents/screening/chunk-limits';
import { mapPool } from '@/lib/agents/screening/map-pool';
import {
  concatenateChunkBodies,
  splitMarkdownIntoChunks,
  type MarkdownChunk,
} from '@/lib/agents/screening/split-markdown-chunks';
import {
  PREPRINT_CHECK_MAX_PER_30_DAYS,
  PREPRINT_CHECK_WINDOW_DAYS,
} from '@/lib/preprint-check-constants';
import { computePublicFingerprint } from '@/lib/server/publication-fingerprint';
import type { AnyClient } from '@/lib/server/service-client';

export interface PreprintSuggestion {
  type: 'narrative' | 'completeness' | 'clarity' | 'style';
  section_key: string | null;
  text: string;
  chunk_index?: number;
  chunk_start?: number;
  chunk_end?: number;
  part_title?: string | null;
}

export interface PreprintRedFlag {
  section_key: string | null;
  issue: string;
  severity: 1 | 2 | 3;
  chunk_index?: number;
  chunk_start?: number;
  chunk_end?: number;
  part_title?: string | null;
}

export interface PreprintFeedback {
  overall_quality: number;
  strengths: string[];
  suggestions: PreprintSuggestion[];
  red_flags: PreprintRedFlag[];
  ready_for_publication: boolean;
  aiError?: boolean;
  /** Testo vuoto o solo spazi: nessun modello chiamato. */
  emptyText?: boolean;
  contentFingerprint?: string;
  chunksExamined?: number;
  chunksTotal?: number;
  /** Durata in ms di ciascun pezzo (indice = chunk.index). */
  chunkDurationsMs?: number[];
}

export type PreprintLimitReason = 'same_fingerprint' | 'window_exhausted' | 'lookup_failed';

function normalizeChunkFeedback(input: unknown): Omit<PreprintFeedback, 'aiError'> {
  if (!input || typeof input !== 'object') {
    return {
      overall_quality: 0,
      strengths: [],
      suggestions: [],
      red_flags: [],
      ready_for_publication: false,
    };
  }

  const obj = input as Record<string, unknown>;
  const quality =
    typeof obj.overall_quality === 'number' && Number.isFinite(obj.overall_quality)
      ? Math.max(0, Math.min(5, Math.round(obj.overall_quality)))
      : 0;
  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths.filter((s): s is string => typeof s === 'string').slice(0, 3)
    : [];
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .map((s): PreprintSuggestion | null => {
          if (!s || typeof s !== 'object') return null;
          const rec = s as Record<string, unknown>;
          const type = rec.type;
          if (type !== 'narrative' && type !== 'completeness' && type !== 'clarity' && type !== 'style') {
            return null;
          }
          const text = typeof rec.text === 'string' ? rec.text.slice(0, 200) : '';
          if (!text) return null;
          return {
            type,
            section_key: typeof rec.section_key === 'string' ? rec.section_key : null,
            text,
          };
        })
        .filter((s): s is PreprintSuggestion => s !== null)
    : [];
  const redFlags = Array.isArray(obj.red_flags)
    ? obj.red_flags
        .map((r): PreprintRedFlag | null => {
          if (!r || typeof r !== 'object') return null;
          const rec = r as Record<string, unknown>;
          const sev = rec.severity;
          const issue = typeof rec.issue === 'string' ? rec.issue : '';
          if (!issue || (sev !== 1 && sev !== 2 && sev !== 3)) return null;
          return {
            section_key: typeof rec.section_key === 'string' ? rec.section_key : null,
            issue,
            severity: sev,
          };
        })
        .filter((r): r is PreprintRedFlag => r !== null)
    : [];

  return {
    overall_quality: quality,
    strengths,
    suggestions,
    red_flags: redFlags,
    ready_for_publication: obj.ready_for_publication === true,
  };
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  de: 'German',
  fr: 'French',
};

const QUALITY_FOCUS =
  'This is the final quality check before print. Focus on:\n' +
  '- Narrative flow and completeness of life moments\n' +
  '- Clarity, repetition, and pacing\n' +
  '- Final polish: anything that would embarrass the author if published as-is\n' +
  '- Legal sensitivity: statements about living persons that could constitute defamation, privacy violations, or unverified criminal accusations — flag as severity 3 (advisory only; does not block)\n' +
  '- AI training risk: if the text explicitly asks to be used for AI training, flag severity 3\n' +
  'Be thorough but kind. This report does not block publication; compliance screening is separate.';

async function reviewOneChunk(
  chunk: MarkdownChunk,
  contentLanguage: string,
  usageOwner: { userId?: string | null; biographyId?: string | null }
): Promise<PreprintFeedback> {
  const errorResult: PreprintFeedback = {
    overall_quality: 0,
    strengths: [],
    suggestions: [],
    red_flags: [],
    ready_for_publication: false,
    aiError: true,
  };

  const langCode = (contentLanguage || 'en').toLowerCase().split(/[-_]/)[0];
  const langName = LANG_NAMES[langCode] ?? 'English';
  const partNote = chunk.partTitle ? `Part title: ${chunk.partTitle}. ` : '';
  const posNote = `Chunk ${chunk.index + 1}, characters ${chunk.start}–${chunk.end}. `;

  const systemPrompt =
    'You are a biography editor reviewing a personal life story for publication. ' +
    'Your role is to give constructive, encouraging feedback. The author may be elderly or not a professional writer. ' +
    `Write every user-visible string in the JSON (strengths, suggestions[].text, red_flags[].issue) in ${langName}. ` +
    'Be kind but honest. Respond only with valid JSON. ' +
    'You are reviewing ONE chunk of a longer text; judge only this chunk (use CONTEXT only for continuity).';

  const jsonShapeBlock =
    'Return ONLY this JSON shape (no markdown, no explanations):\n' +
    '{\n' +
    '  "overall_quality": 1-5,\n' +
    '  "strengths": ["max 3 short strings"],\n' +
    '  "suggestions": [\n' +
    '    {\n' +
    '      "type": "narrative" | "completeness" | "clarity" | "style",\n' +
    '      "section_key": "string or null",\n' +
    '      "text": "short actionable suggestion, max 200 chars"\n' +
    '    }\n' +
    '  ],\n' +
    '  "red_flags": [\n' +
    '    {\n' +
    '      "section_key": "string or null",\n' +
    '      "issue": "brief description",\n' +
    '      "severity": 1 | 2 | 3\n' +
    '    }\n' +
    '  ],\n' +
    '  "ready_for_publication": boolean\n' +
    '}\n\n';

  const userPrompt =
    jsonShapeBlock +
    `IMPORTANT: All JSON string values shown to the author must be written in ${langName}.\n\n` +
    partNote +
    posNote +
    'Biography chunk:\n' +
    chunk.modelText +
    '\n\n' +
    QUALITY_FOCUS;

  try {
    const result = await chat({
      role: 'reviewer',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
      timeoutMs: CHUNK_AI_TIMEOUT_MS,
      allowFallback: false,
      retry: { attempts: SCREENING_SAME_MODEL_RETRIES, baseDelayMs: SCREENING_RETRY_BASE_DELAY_MS },
      usage: { purpose: 'preprint_check', ...usageOwner },
    });

    const rawText: string = result.content ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return errorResult;
    const parsed = normalizeChunkFeedback(JSON.parse(match[0]));
    return {
      ...parsed,
      suggestions: parsed.suggestions.map((s) => ({
        ...s,
        chunk_index: chunk.index,
        chunk_start: chunk.start,
        chunk_end: chunk.end,
        part_title: chunk.partTitle,
        section_key: s.section_key ?? chunk.partTitle,
      })),
      red_flags: parsed.red_flags.map((r) => ({
        ...r,
        chunk_index: chunk.index,
        chunk_start: chunk.start,
        chunk_end: chunk.end,
        part_title: chunk.partTitle,
        section_key: r.section_key ?? chunk.partTitle,
      })),
    };
  } catch (err) {
    console.error('[preprint-check] chunk error', chunk.index, err);
    return errorResult;
  }
}

export function mergePreprintFeedback(
  parts: PreprintFeedback[],
  chunkDurationsMs?: number[]
): PreprintFeedback {
  if (parts.some((p) => p.aiError)) {
    return {
      overall_quality: 0,
      strengths: [],
      suggestions: [],
      red_flags: [],
      ready_for_publication: false,
      aiError: true,
      chunksExamined: parts.filter((p) => !p.aiError).length,
      chunksTotal: parts.length,
      chunkDurationsMs,
    };
  }
  const qualities = parts.map((p) => p.overall_quality).filter((q) => q > 0);
  const overall =
    qualities.length > 0
      ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
      : 0;
  return {
    overall_quality: overall,
    strengths: parts.flatMap((p) => p.strengths).slice(0, 5),
    suggestions: parts.flatMap((p) => p.suggestions),
    red_flags: parts.flatMap((p) => p.red_flags),
    ready_for_publication: parts.every((p) => p.ready_for_publication),
    chunksExamined: parts.length,
    chunksTotal: parts.length,
    chunkDurationsMs,
  };
}

/**
 * Controlla se si può ancora eseguire il controllo finale su questa biografia
 * per l'impronta data (1× per versione; max N in 30 giorni).
 */
export async function canRunPreprintCheck(
  client: AnyClient,
  biographyId: string,
  contentFingerprint: string
): Promise<{ ok: true } | { ok: false; reason: PreprintLimitReason }> {
  const { data: sameFp, error: sameErr } = await client
    .from('preprint_check_runs')
    .select('id')
    .eq('biography_id', biographyId)
    .eq('content_fingerprint', contentFingerprint)
    .limit(1)
    .maybeSingle();
  if (sameErr) {
    console.error('[preprint-check] fingerprint lookup failed', sameErr);
    return { ok: false, reason: 'lookup_failed' };
  }
  if (sameFp) return { ok: false, reason: 'same_fingerprint' };

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - PREPRINT_CHECK_WINDOW_DAYS);
  const { count, error } = await client
    .from('preprint_check_runs')
    .select('id', { count: 'exact', head: true })
    .eq('biography_id', biographyId)
    .gte('created_at', since.toISOString());
  if (error) {
    console.error('[preprint-check] count failed', error);
    return { ok: false, reason: 'lookup_failed' };
  }
  if ((count ?? 0) >= PREPRINT_CHECK_MAX_PER_30_DAYS) {
    return { ok: false, reason: 'window_exhausted' };
  }
  return { ok: true };
}

export async function recordPreprintCheckRun(
  client: AnyClient,
  biographyId: string,
  contentFingerprint: string
): Promise<void> {
  const { error } = await client.from('preprint_check_runs').insert({
    biography_id: biographyId,
    content_fingerprint: contentFingerprint,
  });
  if (error) throw new Error(`preprint_check_record_failed:${error.message}`);
}

/**
 * Controllo finale di qualità su tutto il testo a pezzi. Non blocca la
 * pubblicazione: l'autore può approvare il PDF anche senza seguire i suggerimenti.
 */
export async function runPreprintCheck(
  biographyText: string,
  contentLanguage: string = 'en',
  usageOwner: { userId?: string | null; biographyId?: string | null } = {}
): Promise<PreprintFeedback> {
  const errorResult: PreprintFeedback = {
    overall_quality: 0,
    strengths: [],
    suggestions: [],
    red_flags: [],
    ready_for_publication: false,
    aiError: true,
  };

  if (!biographyText.trim()) {
    console.warn('[preprint-check] empty text — no model call');
    return { ...errorResult, emptyText: true };
  }

  if (!process.env.INFOMANIAK_AI_TOKEN || !process.env.INFOMANIAK_AI_ENDPOINT) {
    console.warn('[preprint-check] Infomaniak AI not configured');
    return errorResult;
  }

  const chunks = splitMarkdownIntoChunks(biographyText);
  if (concatenateChunkBodies(chunks) !== biographyText) {
    console.error('[preprint-check] chunk reconstruction mismatch');
    return errorResult;
  }

  const chunkDurationsMs = new Array<number>(chunks.length).fill(0);
  const parts = await mapPool(chunks, SCREENING_CHUNK_CONCURRENCY, async (chunk) => {
    const t0 = Date.now();
    try {
      return await reviewOneChunk(chunk, contentLanguage, usageOwner);
    } finally {
      chunkDurationsMs[chunk.index] = Date.now() - t0;
    }
  });
  return mergePreprintFeedback(parts, chunkDurationsMs);
}

export async function resolveContentFingerprintForPreprint(
  client: AnyClient,
  biographyId: string
): Promise<string | null> {
  return computePublicFingerprint(client, biographyId);
}
