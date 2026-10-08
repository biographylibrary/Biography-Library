import { createHash } from 'crypto';
import { chat } from '@/lib/agents/infomaniak-client';
import {
  buildScreeningSystemPrompt,
  buildScreeningUserPrompt,
} from '@/lib/agents/prompts/reviewer';
import { SCREENING_VERDICT_TOOL } from '@/lib/agents/tools/reviewer-tools';
import {
  CHUNK_AI_TIMEOUT_MS,
  SCREENING_CHUNK_CONCURRENCY,
  SCREENING_RETRY_BASE_DELAY_MS,
  SCREENING_SAME_MODEL_RETRIES,
  forcedFailChunkIndex,
} from '@/lib/agents/screening/chunk-limits';
import { mapPool } from '@/lib/agents/screening/map-pool';
import {
  concatenateChunkBodies,
  splitMarkdownIntoChunks,
  type MarkdownChunk,
} from '@/lib/agents/screening/split-markdown-chunks';
import type { ScreeningPassage, ScreeningResult } from '@/lib/agents/screening/types';

function normalizePassage(raw: unknown): ScreeningPassage | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const text = typeof p.text === 'string' ? p.text.slice(0, 400) : '';
  const section_key = typeof p.section_key === 'string' ? p.section_key : 'unknown';
  const reason = typeof p.reason === 'string' ? p.reason.slice(0, 150) : '';
  const sev = p.severity;
  if (!text || !reason || (sev !== 1 && sev !== 2 && sev !== 3)) return null;
  return { text, section_key, reason, severity: sev };
}

export function normalizeScreeningVerdict(input: unknown): ScreeningResult | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const passages = Array.isArray(obj.passages)
    ? obj.passages.map(normalizePassage).filter((p): p is ScreeningPassage => p !== null)
    : [];
  const overall =
    typeof obj.overall_severity === 'number' && Number.isFinite(obj.overall_severity)
      ? Math.max(0, Math.min(3, Math.round(obj.overall_severity)))
      : passages.reduce((max, p) => Math.max(max, p.severity), 0);
  const summary = typeof obj.summary === 'string' ? obj.summary.slice(0, 500) : undefined;
  return { passages, overall_severity: overall, summary };
}

export interface ScreeningUsageOwner {
  userId?: string | null;
  biographyId?: string | null;
}

type ChunkVerdict =
  | { ok: true; result: ScreeningResult }
  | { ok: false; parseError?: boolean };

function attachChunkMeta(result: ScreeningResult, chunk: MarkdownChunk): ScreeningResult {
  return {
    ...result,
    passages: result.passages.map((p) => ({
      ...p,
      chunk_index: chunk.index,
      chunk_start: chunk.start,
      chunk_end: chunk.end,
      part_title: chunk.partTitle,
      section_key:
        p.section_key === 'unknown' && chunk.partTitle
          ? chunk.partTitle
          : p.section_key,
    })),
  };
}

async function runLegacyScreeningOnChunk(
  chunkText: string,
  focusSectionKeys: string[] | undefined,
  owner: ScreeningUsageOwner
): Promise<ChunkVerdict> {
  const focusNote =
    focusSectionKeys && focusSectionKeys.length > 0
      ? `The text below may be one continuous “final version” without per-section headings. ` +
        `Prioritize passages that relate to these labels; use these exact section_key values in your JSON when a passage clearly matches: ${focusSectionKeys.join(', ')}. ` +
        `If a problem does not map to one label, pick the closest section_key or use the first label from the list.\n\n`
      : '';

  const systemPrompt =
    'You are a content moderator for a biography publishing platform. ' +
    'Respond only with valid JSON. No explanations, no markdown, no code blocks. Only the raw JSON object.';

  const userPrompt =
    'Analyze this biography text for potentially problematic content. ' +
    'Identify passages that:\n' +
    '- Make unverified factual claims about living persons\n' +
    '- Contain potentially defamatory statements\n' +
    '- Include explicit personal details about third parties without apparent consent\n' +
    '- Contain hate speech or discriminatory content\n' +
    '- Make unverified legal or criminal accusations\n\n' +
    'For each problematic passage, include:\n' +
    '- text: the exact sentence (max 400 chars)\n' +
    '- section_key: which section it came from\n' +
    '- reason: brief explanation (max 150 chars)\n' +
    '- severity: 1 (minor), 2 (moderate), or 3 (serious)\n\n' +
    'If no issues are found, return an empty passages array. ' +
    'overall_severity should be the max severity found, or 0.\n\n' +
    'Return ONLY this JSON:\n' +
    '{"passages":[],"overall_severity":0}\n\n' +
    'Biography:\n' +
    focusNote +
    chunkText;

  try {
    const result = await chat({
      role: 'reviewer',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 2048,
      timeoutMs: CHUNK_AI_TIMEOUT_MS,
      retry: { attempts: SCREENING_SAME_MODEL_RETRIES, baseDelayMs: SCREENING_RETRY_BASE_DELAY_MS },
      usage: { purpose: 'screening', ...owner },
    });

    const rawText = result.content ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[publication-screening] legacy: no JSON in response');
      return { ok: false, parseError: true };
    }

    const parsed = normalizeScreeningVerdict(JSON.parse(match[0]));
    if (!parsed) return { ok: false, parseError: true };
    return { ok: true, result: parsed };
  } catch (err) {
    console.error('[publication-screening] legacy screening error:', err);
    return { ok: false };
  }
}

async function screenOneChunk(
  chunk: MarkdownChunk,
  focusSectionKeys: string[] | undefined,
  owner: ScreeningUsageOwner
): Promise<ChunkVerdict> {
  const forceFail = forcedFailChunkIndex();
  if (forceFail !== null && chunk.index === forceFail) {
    console.warn('[publication-screening] forced fail on chunk', chunk.index);
    return { ok: false };
  }

  const userPrompt = buildScreeningUserPrompt(chunk.modelText, focusSectionKeys);

  try {
    const result = await chat({
      role: 'reviewer',
      messages: [
        { role: 'system', content: buildScreeningSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
      tools: [SCREENING_VERDICT_TOOL],
      tool_choice: { type: 'function', function: { name: 'submit_screening_verdict' } },
      stream: false,
      temperature: 0.2,
      max_tokens: 2048,
      timeoutMs: CHUNK_AI_TIMEOUT_MS,
      retry: { attempts: SCREENING_SAME_MODEL_RETRIES, baseDelayMs: SCREENING_RETRY_BASE_DELAY_MS },
      usage: { purpose: 'screening', ...owner },
    });

    const toolCall = result.tool_calls?.[0];
    if (toolCall?.function?.name === 'submit_screening_verdict') {
      const verdict = normalizeScreeningVerdict(JSON.parse(toolCall.function.arguments));
      if (verdict) return { ok: true, result: attachChunkMeta(verdict, chunk) };
    }

    if (result.content?.trim()) {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        const verdict = normalizeScreeningVerdict(JSON.parse(match[0]));
        if (verdict) return { ok: true, result: attachChunkMeta(verdict, chunk) };
      }
    }

    console.warn('[publication-screening] tool verdict missing on chunk', chunk.index);
  } catch (err) {
    console.warn('[publication-screening] agent screening failed on chunk', chunk.index, err);
  }

  const legacy = await runLegacyScreeningOnChunk(chunk.modelText, focusSectionKeys, owner);
  if (!legacy.ok) return legacy;
  return { ok: true, result: attachChunkMeta(legacy.result, chunk) };
}

/**
 * Screening di conformità sull'intero testo, a pezzi. Se anche un solo pezzo
 * resta senza verdetto valido → ai_error (coda umana, nessuna pubblicazione
 * automatica). L'esito complessivo è il più grave fra i pezzi.
 */
export async function runPublicationScreening(
  biographyText: string,
  focusSectionKeys?: string[],
  owner: ScreeningUsageOwner = {}
): Promise<ScreeningResult> {
  const errorResult = (extra: Partial<ScreeningResult> = {}): ScreeningResult => ({
    passages: [],
    overall_severity: 0,
    aiError: true,
    sourceChars: biographyText.length,
    examinedChars: 0,
    ...extra,
  });

  if (!biographyText.trim()) {
    console.warn('[publication-screening] empty text — no model call');
    return errorResult({ emptyText: true });
  }

  if (!process.env.INFOMANIAK_AI_TOKEN || !process.env.INFOMANIAK_AI_ENDPOINT) {
    console.warn('[publication-screening] Infomaniak not configured');
    return errorResult();
  }

  const chunks = splitMarkdownIntoChunks(biographyText);
  const rebuilt = concatenateChunkBodies(chunks);
  if (rebuilt !== biographyText) {
    console.error('[publication-screening] chunk reconstruction mismatch');
    return errorResult({ parseError: true });
  }

  const chunkDurationsMs = new Array<number>(chunks.length).fill(0);
  const verdicts = await mapPool(chunks, SCREENING_CHUNK_CONCURRENCY, async (chunk) => {
    const t0 = Date.now();
    try {
      return await screenOneChunk(chunk, focusSectionKeys, owner);
    } finally {
      chunkDurationsMs[chunk.index] = Date.now() - t0;
    }
  });

  const failed = verdicts.find((v) => !v.ok);
  if (failed) {
    return errorResult({
      parseError: failed.ok === false && failed.parseError === true,
      chunksTotal: chunks.length,
      chunksExamined: verdicts.filter((v) => v.ok).length,
      chunkDurationsMs,
    });
  }

  const okResults = verdicts.map((v) => (v as { ok: true; result: ScreeningResult }).result);
  const passages = okResults.flatMap((r) => r.passages);
  const overall = okResults.reduce((max, r) => Math.max(max, r.overall_severity), 0);
  const summaries = okResults
    .map((r) => r.summary)
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  const examinedChars = chunks.reduce((n, c) => n + c.body.length, 0);
  const reconstructedFingerprint = createHash('sha256').update(rebuilt, 'utf8').digest('hex');

  return {
    passages,
    overall_severity: overall,
    summary: summaries.length > 0 ? summaries.join(' ').slice(0, 500) : undefined,
    examinedChars,
    sourceChars: biographyText.length,
    reconstructedFingerprint,
    chunksExamined: chunks.length,
    chunksTotal: chunks.length,
    chunkDurationsMs,
  };
}
