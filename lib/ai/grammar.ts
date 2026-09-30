/**
 * Controllo grammaticale su richiesta. Spostato dall'Edge Function `ai-assistant`
 * (azione `grammar`) senza cambiare prompt, modelli, ordine di ripiego né
 * parametri: temperatura 0.7, max_tokens 2048, timeout 45 s, tre tentativi con
 * attesa 500 ms raddoppiata per 429/503/504.
 */

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

const JSON_ONLY_PREFIX =
  'You must respond with valid JSON only. Do not add any explanation, preamble, or text outside the JSON structure. Do not wrap the JSON in markdown code fences.\n\n';

/**
 * Tetto di lunghezza del testo (caratteri, dopo aver tolto l'HTML). Oggi
 * l'interfaccia invia al massimo un capitolo o l'intero foglio libero
 * (nei dati attuali: sezione più lunga 11.598 caratteri, foglio libero più
 * lungo 22.555). Sopra il tetto la rotta rifiuta la richiesta: niente
 * troncamento silenzioso.
 */
export const GRAMMAR_MAX_CHARS = 30_000;

/** Difesa prima di togliere l'HTML: un corpo enorme non entra nemmeno nel parser. */
export const GRAMMAR_MAX_RAW_CHARS = 200_000;

export const GRAMMAR_MODEL_PARAMS = {
  max_tokens: 2048,
  temperature: 0.7,
  timeoutMs: 45_000,
  retry: { attempts: 3, baseDelayMs: 500 },
} as const;

/** Apertus 1.5 per primo, poi Gemma, poi Mistral: stessi nomi di variabile dell'edge function. */
export function grammarModelChain(): string[] {
  const primary = process.env.INFOMANIAK_AI_MODEL_PRIMARY ?? 'google/gemma-4-31B-it';
  const fallback =
    process.env.INFOMANIAK_AI_MODEL_FALLBACK ?? 'mistralai/Mistral-Small-4-119B-2603';
  const grammar = process.env.INFOMANIAK_AI_MODEL_GRAMMAR ?? 'swiss-ai/Apertus-v1.5-70B';
  return [grammar, primary, fallback].filter((model, index, all) => all.indexOf(model) === index);
}

export function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return text.trim();

  let start: number;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  const lastClose = text.lastIndexOf(closeChar);

  if (lastClose > start) {
    return text.slice(start, lastClose + 1).trim();
  }
  return text.trim();
}

function getLangName(lang: string): string {
  return LANGUAGE_NAMES[lang] || 'English';
}

export function buildGrammarPrompt(sectionTitle: string, content: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `${JSON_ONLY_PREFIX}You are a skilled editor helping with a biography written in ${langName}. Review text for grammar, spelling, clarity, and style in ${langName}. Preserve the author's voice and tone. Respond in ${langName}. Return a JSON array of suggestions.

Each suggestion must have:
- "id": unique string
- "original": exact substring copied verbatim from the user text (enough context for a unique find-and-replace)
- "suggestion": the full replacement for that same span — MUST differ from "original"
- "explanation": brief reason in ${langName}

Rules:
- Include an entry ONLY when you recommend a concrete wording change.
- If a phrase is already correct, omit it — never return identical "original" and "suggestion".
- Put the preferred replacement in "suggestion", not only in "explanation" (e.g. if you mention an alternative phrase in the explanation, that phrase must appear in "suggestion").
- If no changes are needed, return an empty array [].`,
    user: `Section: "${sectionTitle}"\n\nText to review:\n${content}`,
  };
}

function normalizeGrammarText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export type GrammarSuggestion = {
  id?: string;
  original?: string;
  suggestion?: string;
  explanation?: string;
};

export function sanitizeGrammarSuggestions(items: GrammarSuggestion[]): GrammarSuggestion[] {
  return items.filter((item) => {
    const original = String(item.original ?? '').trim();
    const suggestion = String(item.suggestion ?? '').trim();
    if (!original || !suggestion) return false;
    return normalizeGrammarText(original) !== normalizeGrammarText(suggestion);
  });
}

type Locale = 'en' | 'it' | 'fr' | 'de';

function resolveLocale(raw?: string | null): Locale {
  const code = (raw ?? 'en').slice(0, 2).toLowerCase();
  return code === 'it' || code === 'fr' || code === 'de' ? code : 'en';
}

/** Messaggio nelle quattro lingue quando il testo supera il tetto. */
export function grammarTooLongMessage(rawLocale?: string | null): string {
  const max = GRAMMAR_MAX_CHARS.toLocaleString(resolveLocale(rawLocale));
  switch (resolveLocale(rawLocale)) {
    case 'it':
      return `Il testo è troppo lungo per il controllo grammaticale (massimo ${max} caratteri). Seleziona e controlla una parte più breve: il testo non è stato controllato.`;
    case 'fr':
      return `Le texte est trop long pour la vérification grammaticale (${max} caractères au maximum). Sélectionnez et vérifiez une partie plus courte : le texte n'a pas été vérifié.`;
    case 'de':
      return `Der Text ist für die Grammatikprüfung zu lang (höchstens ${max} Zeichen). Bitte prüfen Sie einen kürzeren Abschnitt: Der Text wurde nicht geprüft.`;
    default:
      return `The text is too long for the grammar check (maximum ${max} characters). Please check a shorter part: the text has not been checked.`;
  }
}
