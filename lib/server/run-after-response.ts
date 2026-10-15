/**
 * Esegue un lavoro dopo aver risposto alla richiesta HTTP.
 * Next.js `after()` esiste da v15; qui siamo su 13.5 con runtime Node
 * long-lived (Jelastic Docker), quindi un promise non atteso continua.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  void task().catch((err) => {
    console.error('[runAfterResponse]', err);
  });
}
