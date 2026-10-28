const ECHO_VOICE_OUTPUT_KEY = 'echo-voice-output-enabled';

/**
 * La voce di Echo che legge le risposte è spenta finché l'autore non la accende col pulsante:
 * ogni risposta letta costa una chiamata al servizio vocale e tempo di attesa, e la maggior
 * parte di chi scrive vuole solo il testo. Una scelta già fatta (acceso o spento) resta com'è.
 */
export const ECHO_VOICE_OUTPUT_DEFAULT = false;

export function getEchoVoiceOutputEnabled(): boolean {
  if (typeof window === 'undefined') return ECHO_VOICE_OUTPUT_DEFAULT;
  try {
    const stored = localStorage.getItem(ECHO_VOICE_OUTPUT_KEY);
    if (stored === null) return ECHO_VOICE_OUTPUT_DEFAULT;
    return stored === 'true';
  } catch {
    // Archivio del browser non leggibile (finestra privata, dati bloccati): vale il valore predefinito.
    return ECHO_VOICE_OUTPUT_DEFAULT;
  }
}

export function setEchoVoiceOutputEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ECHO_VOICE_OUTPUT_KEY, String(enabled));
  } catch {
    /* non salvabile: la scelta vale solo per questa visita */
  }
}
