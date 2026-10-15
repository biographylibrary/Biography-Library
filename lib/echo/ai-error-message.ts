/**
 * Traduce i codici di errore delle route IA in testi dell’interfaccia.
 * Nessun codice tecnico inglese deve arrivare allo schermo dell’autore.
 */

export type EchoErrorCopy = {
  errorGeneric: string;
  aiFeaturesDisabled: string;
  errorRateLimitBurst: string;
  errorRateLimitDaily: string;
  errorNotAvailableForEdition: string;
};

export type ResolvedAiError = {
  /** Testo già nella lingua dell’interfaccia. */
  message: string;
  /** Se true, mostrare il collegamento alle Impostazioni (solo ai_features_disabled). */
  linkToSettings: boolean;
};

/** Codice snake_case puro (es. ai_features_disabled). */
const SNAKE_CODE = /^[a-z][a-z0-9_]*$/;

function headToken(raw: string): string {
  return raw.trim().split(/\s+/)[0]?.replace(/[.:,;]+$/, '') ?? '';
}

/**
 * Se `raw` è un codice noto (o inizia con quel codice), restituisce il testo
 * tradotto. I codici sconosciuti in snake_case diventano il generico: non
 * devono mai comparire grezzi. Una frase già leggibile resta così.
 */
export function resolveAiErrorMessage(
  raw: string | null | undefined,
  copy: EchoErrorCopy
): ResolvedAiError {
  if (!raw || !raw.trim()) {
    return { message: copy.errorGeneric, linkToSettings: false };
  }

  const trimmed = raw.trim();
  const code = headToken(trimmed);

  switch (code) {
    case 'ai_features_disabled':
      return { message: copy.aiFeaturesDisabled, linkToSettings: true };
    case 'rate_limit_burst':
      return { message: copy.errorRateLimitBurst, linkToSettings: false };
    case 'rate_limit_daily':
      return { message: copy.errorRateLimitDaily, linkToSettings: false };
    case 'echo_not_available_for_edition':
      return { message: copy.errorNotAvailableForEdition, linkToSettings: false };
    default:
      break;
  }

  if (SNAKE_CODE.test(trimmed)) {
    return { message: copy.errorGeneric, linkToSettings: false };
  }

  return { message: trimmed, linkToSettings: false };
}
