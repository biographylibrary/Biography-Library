export type ScreeningPassage = {
  text: string;
  section_key: string;
  reason: string;
  severity: number;
  /** Indice del pezzo in cui è stato trovato (0-based). */
  chunk_index?: number;
  /** Offset di inizio del pezzo nel testo di origine. */
  chunk_start?: number;
  /** Offset di fine del pezzo nel testo di origine. */
  chunk_end?: number;
  /** Titolo della parte Markdown in cui cade il pezzo. */
  part_title?: string | null;
};

export type ScreeningResult = {
  passages: ScreeningPassage[];
  overall_severity: number;
  aiError?: boolean;
  parseError?: boolean;
  /** Testo vuoto o solo spazi: nessun modello chiamato. */
  emptyText?: boolean;
  summary?: string;
  /** Caratteri dei body dei pezzi con verdetto valido (senza contesto ripetuto). */
  examinedChars?: number;
  /** Lunghezza del testo di origine. */
  sourceChars?: number;
  /** Impronta SHA-256 del testo ricostruito dai pezzi. */
  reconstructedFingerprint?: string;
  /** Quanti pezzi sono stati esaminati con successo. */
  chunksExamined?: number;
  /** Quanti pezzi componevano il testo. */
  chunksTotal?: number;
  /** Durata in ms di ciascun pezzo (indice = chunk.index). */
  chunkDurationsMs?: number[];
};
