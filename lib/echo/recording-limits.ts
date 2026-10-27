/** Durata massima di una registrazione vocale: allo scadere si ferma e si invia da sola. */
export const ECHO_MAX_RECORDING_SECONDS = 5 * 60;

/** Da quanti secondi dalla fine compare l'avviso. */
export const ECHO_RECORDING_WARNING_SECONDS = 30;

/**
 * Bitrate di registrazione: 32 kbit/s bastano per il parlato e tengono 5 minuti
 * attorno a 1,2 MB (il predefinito di Chrome, 128 kbit/s, ne farebbe 4,8).
 */
export const ECHO_RECORDING_BITS_PER_SECOND = 32_000;

/**
 * Tetto di peso accettato dalla Edge Function: ampio margine sopra i 5 minuti
 * anche a 128 kbit/s (4,8 MB), per i browser che ignorano il bitrate richiesto.
 */
export const ECHO_MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export function echoRecordingRemainingSeconds(elapsedSeconds: number): number {
  return Math.max(0, ECHO_MAX_RECORDING_SECONDS - Math.floor(elapsedSeconds));
}

export function echoRecordingLimitReached(elapsedSeconds: number): boolean {
  return elapsedSeconds >= ECHO_MAX_RECORDING_SECONDS;
}

export function echoRecordingWarningActive(elapsedSeconds: number): boolean {
  const remaining = echoRecordingRemainingSeconds(elapsedSeconds);
  return remaining > 0 && remaining <= ECHO_RECORDING_WARNING_SECONDS;
}

/** m:ss, per il cronometro. */
export function formatEchoClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
