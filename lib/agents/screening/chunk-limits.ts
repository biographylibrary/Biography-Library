/**
 * Finestra e pezzi per lo screening / controllo finale (ruolo reviewer).
 *
 * Infomaniak applica a `google/gemma-4-31B-it` un tetto di servizio di 100.000
 * token (il modello nativo ne ha di più). La dimensione massima di un pezzo è
 * al più un quarto di (finestra − prompt − uscita riservata).
 */

/** Tetto di servizio Infomaniak per Gemma 4 31B IT (token di contesto). */
export const REVIEWER_CONTEXT_WINDOW_TOKENS = 100_000;

/** Riserva per system prompt, framing utente, schema tool e marcatori di contesto. */
export const SCREENING_PROMPT_RESERVE_TOKENS = 2_500;

/** Allineato a `getModelParams('reviewer').max_tokens`. */
export const REVIEWER_MAX_OUTPUT_TOKENS = 2_048;

/**
 * Massimo token di contenuto per pezzo:
 * floor((100_000 − 2_500 − 2_048) / 4) = 23_863
 */
export const MAX_CHUNK_TOKENS = Math.floor(
  (REVIEWER_CONTEXT_WINDOW_TOKENS - SCREENING_PROMPT_RESERVE_TOKENS - REVIEWER_MAX_OUTPUT_TOKENS) / 4
);

/**
 * Budget di “unità carattere” per pezzo (1 per latini, 3 per CJK).
 * Stima: 1 token ≈ 4 unità (`estimateTokens`).
 */
export const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * 4;

/** Timeout per una chiamata su un pezzo pieno (input lungo + tool call). */
export const CHUNK_AI_TIMEOUT_MS = 180_000;

/** Al massimo due pezzi in parallelo verso Infomaniak. */
export const SCREENING_CHUNK_CONCURRENCY = 2;

/** Nuovi tentativi sullo stesso modello prima del ripiego (timeout / 429 / 503). */
export const SCREENING_SAME_MODEL_RETRIES = 3;
export const SCREENING_RETRY_BASE_DELAY_MS = 1_000;

/**
 * Solo per prove locali: se impostata a un intero > 0, sostituisce MAX_CHUNK_CHARS.
 * Ignorata in produzione (`NODE_ENV === 'production'`).
 */
export function effectiveMaxChunkChars(): number {
  if (process.env.NODE_ENV === 'production') return MAX_CHUNK_CHARS;
  const raw = process.env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE?.trim();
  if (!raw) return MAX_CHUNK_CHARS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return MAX_CHUNK_CHARS;
  return n;
}

/**
 * Solo per prove locali: indice 0-based del pezzo da far fallire a forza
 * (risposta senza verdetto). Ignorato se non impostato o in produzione.
 */
export function forcedFailChunkIndex(): number | null {
  if (process.env.NODE_ENV === 'production') return null;
  const raw = process.env.SCREENING_FORCE_FAIL_CHUNK_INDEX?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** CJK Unified + Extension A + Compatibility + Hiragana + Katakana + Hangul. */
const CJK_RE =
  /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

/** Unità di peso per il budget del pezzo: CJK = 3, resto = 1. */
export function charWeight(ch: string): number {
  return CJK_RE.test(ch) ? 3 : 1;
}

export function weightedLength(text: string): number {
  let n = 0;
  for (const ch of text) n += charWeight(ch);
  return n;
}
