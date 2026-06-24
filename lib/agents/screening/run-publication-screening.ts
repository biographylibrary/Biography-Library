import { chat } from '@/lib/agents/infomaniak-client';
import {
  buildScreeningSystemPrompt,
  buildScreeningUserPrompt,
} from '@/lib/agents/prompts/reviewer';
import { SCREENING_VERDICT_TOOL } from '@/lib/agents/tools/reviewer-tools';
import type { ScreeningPassage, ScreeningResult } from '@/lib/agents/screening/types';

const AI_TIMEOUT_MS = 30_000;

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

async function runLegacyScreening(
  biographyText: string,
  focusSectionKeys?: string[]
): Promise<ScreeningResult> {
  const errorResult: ScreeningResult = { passages: [], overall_severity: 0, aiError: true };
  const parseErrorResult: ScreeningResult = {
    passages: [],
    overall_severity: 0,
    aiError: true,
    parseError: true,
  };

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
    biographyText;

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
      timeoutMs: AI_TIMEOUT_MS,
    });

    const rawText = result.content ?? '';
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('[publication-screening] legacy: no JSON in response');
      return parseErrorResult;
    }

    const parsed = normalizeScreeningVerdict(JSON.parse(match[0]));
    return parsed ?? parseErrorResult;
  } catch (err) {
    console.error('[publication-screening] legacy screening error:', err);
    return errorResult;
  }
}

/**
 * Publication reviewer screening via Gemma + structured tool call, with legacy JSON fallback.
 */
export async function runPublicationScreening(
  biographyText: string,
  focusSectionKeys?: string[]
): Promise<ScreeningResult> {
  const errorResult: ScreeningResult = { passages: [], overall_severity: 0, aiError: true };

  if (!process.env.INFOMANIAK_AI_TOKEN || !process.env.INFOMANIAK_AI_ENDPOINT) {
    console.warn('[publication-screening] Infomaniak not configured');
    return errorResult;
  }

  const userPrompt = buildScreeningUserPrompt(biographyText, focusSectionKeys);

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
      timeoutMs: AI_TIMEOUT_MS,
    });

    const toolCall = result.tool_calls?.[0];
    if (toolCall?.function?.name === 'submit_screening_verdict') {
      const verdict = normalizeScreeningVerdict(JSON.parse(toolCall.function.arguments));
      if (verdict) return verdict;
    }

    if (result.content?.trim()) {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        const verdict = normalizeScreeningVerdict(JSON.parse(match[0]));
        if (verdict) return verdict;
      }
    }

    console.warn('[publication-screening] tool verdict missing, trying legacy path');
  } catch (err) {
    console.warn('[publication-screening] agent screening failed:', err);
  }

  return runLegacyScreening(biographyText, focusSectionKeys);
}
