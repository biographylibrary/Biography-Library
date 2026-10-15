/**
 * Client per POST /api/profile/ai-features.
 * Interpreta la risposta come da specifica:
 * - purge fallito → lascia spento e segnala riprovabile
 * - nessuna risposta (rete) → ripristina lo stato precedente
 */

export type AiFeaturesToggleInterpretation =
  | { action: 'apply'; enabled: boolean }
  | { action: 'keep_off_retry'; enabled: false }
  | { action: 'restore'; enabled: boolean };

export function interpretAiFeaturesToggleResponse(params: {
  previous: boolean;
  requested: boolean;
  /** false se fetch ha lanciato o non ha prodotto risposta HTTP */
  responded: boolean;
  status?: number;
  body?: { error?: string } | null;
}): AiFeaturesToggleInterpretation {
  const { previous, requested, responded, status, body } = params;

  if (!responded) {
    return { action: 'restore', enabled: previous };
  }

  if (status !== undefined && status >= 200 && status < 300) {
    return { action: 'apply', enabled: requested };
  }

  if (body?.error === 'memory_purge_failed' && requested === false) {
    return { action: 'keep_off_retry', enabled: false };
  }

  return { action: 'restore', enabled: previous };
}

export async function requestAiFeaturesToggle(params: {
  enabled: boolean;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<{ responded: boolean; status?: number; body?: { error?: string } | null }> {
  const fetchFn = params.fetchImpl ?? fetch;
  try {
    const res = await fetchFn('/api/profile/ai-features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({ enabled: params.enabled }),
    });
    let body: { error?: string } | null = null;
    try {
      body = (await res.json()) as { error?: string };
    } catch {
      body = null;
    }
    return { responded: true, status: res.status, body };
  } catch {
    return { responded: false };
  }
}
