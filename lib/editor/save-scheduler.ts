/**
 * Salvataggio del testo poco dopo l'ultima modifica, non solo a intervalli fissi. Prima il testo si
 * salvava ogni 10 secondi: chi chiudeva o ricaricava la scheda nei secondi dopo aver scritto perdeva
 * le ultime righe. Ogni modifica rimanda il salvataggio di qualche istante, così non si salva a ogni
 * tasto mentre si scrive, ma appena ci si ferma.
 */
export const SAVE_DEBOUNCE_MS = 2000;

export type SaveScheduler = {
  /** Rimanda il salvataggio: parte `delayMs` dopo l'ultima chiamata. */
  schedule: () => void;
  /** Annulla un salvataggio in attesa. */
  cancel: () => void;
  /** Vero se un salvataggio è in attesa. */
  pending: () => boolean;
};

export function createSaveScheduler(run: () => void, delayMs = SAVE_DEBOUNCE_MS): SaveScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule() {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        run();
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    pending() {
      return timer !== null;
    },
  };
}
