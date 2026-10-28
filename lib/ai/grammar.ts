/**
 * Controllo grammaticale su richiesta. Spostato dall'Edge Function `ai-assistant`
 * (azione `grammar`) senza cambiare prompt, modelli, ordine di ripiego né
 * parametri (la temperatura è poi scesa da 0.7 a 0.2 per la fedeltà): max_tokens 2048, timeout 45 s, tre tentativi con
 * attesa 500 ms raddoppiata per 429/503/504.
 */

import { FAITHFUL_WRITING_RULES } from '@/lib/agents/prompts/plain-meaning';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italian',
  fr: 'French',
  de: 'German',
};

export type GrammarLanguageCode = keyof typeof LANGUAGE_NAMES;

/**
 * Lingua del testo ammessi al controllo grammaticale: solo it/en/fr/de.
 * Usa la parte prima del trattino (es. de-CH → de); altrimenti null.
 */
export function grammarLanguageForTag(
  tag: string | null | undefined
): GrammarLanguageCode | null {
  if (typeof tag !== 'string') return null;
  const base = tag.trim().split('-')[0]?.toLowerCase() ?? '';
  return base in LANGUAGE_NAMES ? (base as GrammarLanguageCode) : null;
}

const JSON_ONLY_PREFIX =
  'You must respond with valid JSON only. Do not add any explanation, preamble, or text outside the JSON structure. Do not wrap the JSON in markdown code fences.\n\n';

/**
 * Tetto di lunghezza del brano controllato (caratteri, dopo aver tolto l'HTML): circa mezza pagina.
 * Misurato con il modello vero: fino a 4000 caratteri risponde bene e in pochi secondi; oltre,
 * con più errori nel testo, trova sempre meno cose (a 16000 caratteri quasi nessuna) e costa di
 * più. Il controllo è per brani scelti dall'autore, non per l'intero libro: sopra il tetto
 * l'interfaccia e la rotta rifiutano, niente troncamento silenzioso.
 */
export const GRAMMAR_MAX_CHARS = 4000;

/** Difesa prima di togliere l'HTML: un corpo enorme non entra nemmeno nel parser. */
export const GRAMMAR_MAX_RAW_CHARS = 40_000;

export const GRAMMAR_MODEL_PARAMS = {
  max_tokens: 2048,
  // Bassa di proposito: la correzione deve restare fedele al testo dell'autore.
  temperature: 0.2,
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
  const code = grammarLanguageForTag(lang);
  return code ? LANGUAGE_NAMES[code] : LANGUAGE_NAMES.en;
}

export function buildGrammarPrompt(sectionTitle: string, content: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `${JSON_ONLY_PREFIX}You are a skilled editor helping with a biography written in ${langName}. Review text for grammar, spelling, clarity, and style in ${langName}. Preserve the author's voice and tone. Respond in ${langName}. Return a JSON array of suggestions.

${FAITHFUL_WRITING_RULES}

Each suggestion must have:
- "id": unique string
- "original": exact substring copied verbatim from the user text (enough context for a unique find-and-replace)
- "suggestion": the full replacement for that same span — MUST differ from "original"
- "explanation": brief reason in ${langName}

Rules:
- Include an entry ONLY when you recommend a concrete wording change.
- If a phrase is already correct, omit it — never return identical "original" and "suggestion".
- Put the preferred replacement in "suggestion", not only in "explanation" (e.g. if you mention an alternative phrase in the explanation, that phrase must appear in "suggestion").
- "suggestion" holds ONE replacement only: never alternatives, never "or", never text in parentheses.
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

/** Alternative nella stessa proposta, come «(oppure: …)»: il testo applicato le conterrebbe tutte. */
const ALTERNATIVE_IN_SUGGESTION = /\((?:oppure|or|ou|oder|o)\b[:\s]/i;

/** Una correzione non triplica la frase: sopra questa soglia è una riscrittura, non va proposta. */
const MAX_SUGGESTION_GROWTH = { ratio: 2.5, extraChars: 40 } as const;

export function sanitizeGrammarSuggestions(items: GrammarSuggestion[]): GrammarSuggestion[] {
  return items.filter((item) => {
    const original = String(item.original ?? '').trim();
    const suggestion = String(item.suggestion ?? '').trim();
    if (!original || !suggestion) return false;
    if (normalizeGrammarText(original) === normalizeGrammarText(suggestion)) return false;
    if (ALTERNATIVE_IN_SUGGESTION.test(suggestion) && !ALTERNATIVE_IN_SUGGESTION.test(original)) {
      return false;
    }
    const growth = suggestion.length - original.length;
    if (
      suggestion.length > original.length * MAX_SUGGESTION_GROWTH.ratio &&
      growth > MAX_SUGGESTION_GROWTH.extraChars
    ) {
      return false;
    }
    return true;
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

/**
 * Il brano da controllare è solo il testo che l'autore ha selezionato. Senza selezione non si
 * controlla niente (e non si manda niente alla IA): si mostra un avviso. In passato, senza
 * selezione, si controllava il paragrafo dove stava il cursore, e l'autore riceveva proposte su
 * un brano che non aveva scelto.
 */
export function pickGrammarCheckExcerpt(target: {
  selectedText: string;
  blockText?: string;
}): string {
  return target.selectedText.trim();
}

export type GrammarSelectionProblem = 'none' | 'too_long' | null;

/** Controllo fatto nell'interfaccia prima di chiamare la IA. */
export function grammarSelectionProblem(excerpt: string): GrammarSelectionProblem {
  const text = excerpt.trim();
  if (!text) return 'none';
  return text.length > GRAMMAR_MAX_CHARS ? 'too_long' : null;
}

/** 1 a 1: apostrofi, virgolette, trattini e spazi speciali ridotti a quelli semplici. */
function foldQuotes(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00A0\u2009\u202F]/g, ' ');
}

/**
 * Tiene solo le proposte che parlano davvero del testo controllato. Il modello a volte inventa un
 * «originale» che nel brano non c'è, o lo copia con apostrofi e spazi diversi: nel primo caso la
 * proposta non c'entra e si scarta, nel secondo si riscrive «originale» con le parole esatte del
 * brano, così «Applica» lo trova.
 */
export function suggestionsAboutText(items: GrammarSuggestion[], excerpt: string): GrammarSuggestion[] {
  const folded = foldQuotes(excerpt);
  const out: GrammarSuggestion[] = [];
  for (const item of items) {
    const original = String(item.original ?? '');
    if (!original.trim()) continue;
    if (excerpt.includes(original)) {
      out.push(item);
      continue;
    }
    const words = foldQuotes(original).trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const pattern = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
    const match = pattern.exec(folded);
    if (match) out.push({ ...item, original: excerpt.slice(match.index, match.index + match[0].length) });
  }
  return out;
}

/**
 * Legge l'elenco di proposte anche quando la risposta è troncata o ha del testo intorno: si
 * recuperano gli oggetti completi. Restituisce null se non se ne salva nemmeno uno.
 */
export function parseSuggestionsLoose(text: string): GrammarSuggestion[] | null {
  return parseLoose(text) ?? parseLoose(repairJsonStrings(extractJson(text)));
}

/**
 * Ripara gli errori più comuni dentro le stringhe di un JSON scritto da un modello: un apostrofo
 * scritto come \' («c\'ho»), un'altra barra rovesciata che non apre una sequenza valida, un a capo
 * vero dentro la stringa. In italiano gli apostrofi sono ovunque: senza questa riparazione una
 * risposta buona sembrava «non valida» e l'autore vedeva un errore.
 */
export function repairJsonStrings(text: string): string {
  const VALID_ESCAPE = '"\\/bfnrtu';
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '\\') {
      const next = text[i + 1];
      if (next !== undefined && VALID_ESCAPE.includes(next)) {
        out += ch + next;
        i++;
      }
      // altrimenti la barra si toglie: «\'» diventa «'»
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else out += ch;
  }
  return out;
}

function parseLoose(text: string): GrammarSuggestion[] | null {
  try {
    const data = JSON.parse(extractJson(text));
    if (Array.isArray(data)) return data as GrammarSuggestion[];
    if (data && typeof data === 'object' && Array.isArray((data as { suggestions?: unknown }).suggestions)) {
      return (data as { suggestions: GrammarSuggestion[] }).suggestions;
    }
  } catch {
    /* si prova a salvare gli oggetti completi */
  }
  const start = text.indexOf('[');
  if (start < 0) return null;
  const found: GrammarSuggestion[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectStart = -1;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objectStart >= 0) {
        try {
          found.push(JSON.parse(text.slice(objectStart, i + 1)) as GrammarSuggestion);
        } catch {
          /* oggetto rovinato: si salta */
        }
        objectStart = -1;
      }
    }
  }
  return found.length ? found : null;
}
