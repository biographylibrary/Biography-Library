/**
 * Ricerca nella guida per Echo: parti pure, senza rete né database, così si possono provare.
 *
 * Perché esiste. La ricerca originale tagliava ogni sezione ogni 900 caratteri senza guardare le
 * frasi, cercava solo con l'ultima frase scritta e dava a Echo un solo pezzo per sezione scelto per
 * somiglianza di significato. Una domanda breve come «c'è un limite?» trovava le sezioni sbagliate
 * e Echo rispondeva che non c'era nessun limite (il limite di 4000 caratteri del controllo
 * grammaticale era nella guida, in un pezzo che non veniva scelto).
 */

/** Cambia quando cambia il modo di tagliare o cercare: fa rifare l'indice da solo al primo avvio. */
export const KB_RETRIEVAL_VERSION = 2;

/** Lunghezza massima di un pezzo, in caratteri: abbastanza per un concetto intero. */
export const KB_CHUNK_MAX_CHARS = 700;

/** Pezzi dati a Echo, e quanti al massimo per sezione. */
export const KB_PICK_K = 5;
export const KB_MAX_PER_SECTION = 2;

/** Peso della corrispondenza di parole, sommata alla somiglianza di significato (0 a 1). */
export const KB_KEYWORD_WEIGHT = 0.3;

/**
 * Posizioni dove una frase finisce: dopo un punto, un punto esclamativo o interrogativo seguito da
 * spazio (non dentro un indirizzo come biographylibrary.org), o dopo un a capo.
 */
function sentenceEnds(text: string): number[] {
  const ends: number[] = [];
  const re = /[.!?…]["»”')\]]*\s+|\n+/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) ends.push(match.index + match[0].length);
  // La fine del testo chiude l'ultima frase, anche senza spazio dopo.
  if (ends[ends.length - 1] !== text.length) ends.push(text.length);
  return ends;
}

/**
 * Taglia una sezione in pezzi che iniziano e finiscono a confine di frase. Un pezzo non supera
 * KB_CHUNK_MAX_CHARS, salvo una frase sola più lunga (resta intera). Il testo non si altera: si
 * taglia l'originale, senza spazi aggiunti, e nulla si perde.
 */
export function splitKbSection(text: string, maxChars = KB_CHUNK_MAX_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];
  const chunks: string[] = [];
  let start = 0;
  let lastEnd = -1;
  for (const end of sentenceEnds(trimmed)) {
    if (end - start > maxChars && lastEnd > start) {
      chunks.push(trimmed.slice(start, lastEnd).trim());
      start = lastEnd;
    }
    lastEnd = end;
  }
  const rest = trimmed.slice(start).trim();
  if (rest) chunks.push(rest);
  return chunks;
}

const STOP = new Set([
  'come', 'dove', 'cosa', 'quando', 'quanto', 'quanti', 'quale', 'quali', 'perché', 'perche', 'posso', 'puoi',
  'sono', 'della', 'delle', 'degli', 'dello', 'nella', 'nelle', 'questo', 'questa', 'essere', 'fare', 'anche',
  'what', 'where', 'when', 'which', 'does', 'have', 'with', 'from', 'this', 'that', 'there', 'about',
  'comment', 'quoi', 'avec', 'dans', 'pour', 'cette', 'est-ce', 'wann', 'wird', 'kann', 'eine', 'einen', 'nicht',
]);

function foldWord(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Radici delle parole che contano: minuscole, senza accenti, prime 5 lettere. */
export function keywordStems(text: string): string[] {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const stems = new Set<string>();
  for (const word of words) {
    const folded = foldWord(word);
    if (folded.length < 4 || STOP.has(word.toLowerCase())) continue;
    stems.add(folded.slice(0, 5));
  }
  return Array.from(stems);
}

/** Quota delle parole della domanda che compaiono nel pezzo (0 a 1). */
export function keywordOverlap(queryStems: string[], chunkText: string): number {
  if (!queryStems.length) return 0;
  const chunk = new Set(keywordStems(chunkText));
  let hit = 0;
  for (const stem of queryStems) if (chunk.has(stem)) hit++;
  return hit / queryStems.length;
}

export type KbChunkRow = { sourceKey: string; content: string; embedding: number[] };
export type ScoredKbChunk = { sourceKey: string; content: string; score: number };

export function cosineSimilarity(a: number[], b: number[]): number {
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

/** Significato più parole in comune: le domande brevi trovano il pezzo con la parola giusta. */
export function rankKbChunks(queryVec: number[], query: string, rows: KbChunkRow[]): ScoredKbChunk[] {
  const stems = keywordStems(query);
  return rows
    .filter((row) => row.embedding?.length)
    .map((row) => ({
      sourceKey: row.sourceKey,
      content: row.content,
      score: cosineSimilarity(queryVec, row.embedding) + KB_KEYWORD_WEIGHT * keywordOverlap(stems, row.content),
    }))
    .sort((a, b) => b.score - a.score);
}

/** I migliori pezzi, al massimo `perSection` per sezione, in ordine di punteggio. */
export function pickKbChunks(
  scored: ScoredKbChunk[],
  pinned: Array<{ sourceKey: string; content: string }> = [],
  k = KB_PICK_K,
  perSection = KB_MAX_PER_SECTION
): Array<{ sourceKey: string; content: string }> {
  const picked: Array<{ sourceKey: string; content: string }> = [];
  const count = new Map<string, number>();
  const add = (row: { sourceKey: string; content: string }) => {
    if (picked.some((p) => p.sourceKey === row.sourceKey && p.content === row.content)) return;
    if ((count.get(row.sourceKey) ?? 0) >= perSection) return;
    picked.push({ sourceKey: row.sourceKey, content: row.content });
    count.set(row.sourceKey, (count.get(row.sourceKey) ?? 0) + 1);
  };
  for (const p of pinned) add(p);
  for (const row of scored) {
    if (picked.length >= k) break;
    add(row);
  }
  return picked;
}

/**
 * La domanda per la guida. Una frase breve («c'è un limite?») non dice di cosa si parla: si
 * aggiungono la domanda precedente dell'autore e l'inizio dell'ultima risposta di Echo.
 */
export function buildKbQuery(
  message: string,
  history: Array<{ role: string; content?: string | null }>
): string {
  const current = message.trim();
  if (current.length >= 120) return current;
  const text = (m: { content?: string | null }) => (typeof m.content === 'string' ? m.content.trim() : '');
  const previousUser = [...history].reverse().find((m) => m.role === 'user' && text(m));
  const previousAssistant = [...history].reverse().find((m) => m.role === 'assistant' && text(m));
  return [
    previousUser ? text(previousUser).slice(0, 200) : '',
    previousAssistant ? text(previousAssistant).slice(0, 200) : '',
    current,
  ]
    .filter(Boolean)
    .join('\n');
}
