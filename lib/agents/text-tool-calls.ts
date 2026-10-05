import type { ToolCall, ToolDefinition } from '@/lib/agents/infomaniak-client';

/**
 * Alcuni modelli (osservato il 5 ottobre 2026 con Gemma 4 su Infomaniak) scrivono la
 * chiamata a uno strumento come testo, in mezzo alla risposta:
 *
 *   propose_draft(sectionKey="freeflow", draftText="...")
 *
 * invece di usare il campo `tool_calls`. Il fornitore la restituisce come contenuto, e
 * senza questa correzione l'autore legge la riga così com'è, senza la scheda con il
 * pulsante «Inserisci». Qui la si riconosce e la si trasforma in una chiamata vera.
 *
 * Regole, scelte per non eseguire per sbaglio una citazione in una frase:
 * - il nome deve essere quello di uno strumento davvero offerto al modello;
 * - la chiamata deve stare all'inizio di una riga (con al massimo spazi e apici inversi);
 * - gli argomenti devono avere una forma esatta: `chiave="testo"`, `chiave=true`,
 *   `chiave=12`, oppure un solo oggetto JSON; altrimenti il testo resta com'è.
 */

const MAX_RECOVERED_CALLS = 4;

type ParsedArgs = { args: Record<string, unknown>; end: number };

function skipSpaces(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function readString(text: string, from: number): { value: string; end: number } | null {
  const quote = text[from];
  if (quote !== '"' && quote !== "'") return null;
  let out = '';
  let i = from + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      const next = text[i + 1];
      if (next === undefined) return null;
      if (next === 'n') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === 'r') out += '\r';
      else if (next === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      } else out += next;
      i += 2;
      continue;
    }
    if (ch === quote) return { value: out, end: i + 1 };
    out += ch;
    i++;
  }
  return null;
}

function readBareValue(text: string, from: number): { value: unknown; end: number } | null {
  const rest = text.slice(from);
  const literal = /^(true|True|false|False|null|None)\b/.exec(rest);
  if (literal) {
    const word = literal[1].toLowerCase();
    return { value: word === 'true' ? true : word === 'false' ? false : null, end: from + literal[0].length };
  }
  const number = /^-?\d+(?:\.\d+)?/.exec(rest);
  if (number) return { value: Number(number[0]), end: from + number[0].length };
  return null;
}

/** Legge un oggetto JSON che inizia in `from` (parentesi graffe in equilibrio, stringhe rispettate). */
function readJsonObject(text: string, from: number): { value: Record<string, unknown>; end: number } | null {
  if (text[from] !== '{') return null;
  let depth = 0;
  let inString = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(from, i + 1));
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
          return { value: parsed as Record<string, unknown>, end: i + 1 };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** `open` è la posizione della parentesi tonda aperta. Restituisce null se la forma non è quella attesa. */
function parseArgs(text: string, open: number): ParsedArgs | null {
  let i = skipSpaces(text, open + 1);

  if (text[i] === '{') {
    const obj = readJsonObject(text, i);
    if (!obj) return null;
    i = skipSpaces(text, obj.end);
    return text[i] === ')' ? { args: obj.value, end: i + 1 } : null;
  }

  const args: Record<string, unknown> = {};
  if (text[i] === ')') return { args, end: i + 1 };

  for (;;) {
    const key = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
    if (!key) return null;
    i = skipSpaces(text, i + key[0].length);
    if (text[i] !== '=' && text[i] !== ':') return null;
    i = skipSpaces(text, i + 1);

    const str = readString(text, i);
    if (str) {
      args[key[0]] = str.value;
      i = str.end;
    } else {
      const bare = readBareValue(text, i);
      if (!bare) return null;
      args[key[0]] = bare.value;
      i = bare.end;
    }

    i = skipSpaces(text, i);
    if (text[i] === ',') {
      i = skipSpaces(text, i + 1);
      continue;
    }
    return text[i] === ')' ? { args, end: i + 1 } : null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Spazi e apici inversi prima della chiamata, sulla sua stessa riga, e niente altro. */
function startsOwnLine(text: string, start: number): boolean {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  return /^[\s`]*$/.test(text.slice(lineStart, start));
}

export interface RecoveredToolCalls {
  /** Il testo senza le chiamate riconosciute (uguale all'originale se non ce ne sono). */
  text: string;
  calls: ToolCall[];
}

export function recoverTextToolCalls(
  content: string,
  tools: ToolDefinition[] | undefined
): RecoveredToolCalls {
  const names = (tools ?? []).map((tool) => tool.function.name).filter(Boolean);
  if (!content || !names.length) return { text: content, calls: [] };

  const pattern = new RegExp(`(?<![\\w.])(${names.map(escapeRegExp).join('|')})[ \\t]*\\(`, 'g');
  const calls: ToolCall[] = [];
  const cuts: Array<[number, number]> = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) && calls.length < MAX_RECOVERED_CALLS) {
    if (!startsOwnLine(content, match.index)) continue;
    const open = match.index + match[0].length - 1;
    const parsed = parseArgs(content, open);
    if (!parsed) continue;

    // Chiude anche gli apici inversi che avvolgono la chiamata.
    let end = parsed.end;
    while (content[end] === '`') end++;

    calls.push({
      id: `text-call-${globalThis.crypto.randomUUID().slice(0, 8)}`,
      type: 'function',
      function: { name: match[1], arguments: JSON.stringify(parsed.args) },
    });
    cuts.push([content.lastIndexOf('\n', match.index - 1) + 1, end]);
    pattern.lastIndex = end;
  }

  if (!calls.length) return { text: content, calls: [] };

  let text = '';
  let cursor = 0;
  for (const [from, to] of cuts) {
    text += content.slice(cursor, from);
    cursor = to;
  }
  text += content.slice(cursor);

  text = text
    .replace(/```[A-Za-z_-]*\s*```/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, calls };
}
