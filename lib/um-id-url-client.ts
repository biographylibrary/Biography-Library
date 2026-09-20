/**
 * Controparte browser di `lib/um-id-url.ts`.
 *
 * `UM_ID_BASE_URL` è server-only e non viene incorporata nel pacchetto, quindi
 * chi genera un documento nel browser (export di testo, PDF scaricato) chiede
 * l'indirizzo a `GET /api/um-id/base-url`, che lo legge a runtime.
 *
 * Non ripiega su un valore predefinito: se la rotta non risponde, l'errore
 * risale al chiamante, che deve fermare l'export. Un documento già scaricato
 * con l'indirizzo sbagliato non è più correggibile.
 */
export async function fetchUmIdBaseUrl(): Promise<string> {
  const res = await fetch('/api/um-id/base-url', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`um_id_base_url_unavailable (${res.status})`);
  }
  const data = (await res.json()) as { baseUrl?: string };
  const baseUrl = data.baseUrl?.trim();
  if (!baseUrl) {
    throw new Error('um_id_base_url_empty');
  }
  return baseUrl.replace(/\/+$/, '');
}
