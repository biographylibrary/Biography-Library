import { describe, expect, it, vi } from 'vitest';
import {
  interpretAiFeaturesToggleResponse,
  requestAiFeaturesToggle,
} from '@/lib/ai/ai-features-client';

describe('interpretAiFeaturesToggleResponse', () => {
  it('rete assente: ripristina lo stato precedente', () => {
    expect(
      interpretAiFeaturesToggleResponse({
        previous: true,
        requested: false,
        responded: false,
      })
    ).toEqual({ action: 'restore', enabled: true });
  });

  it('purge fallito: lascia spento e chiede riprova', () => {
    expect(
      interpretAiFeaturesToggleResponse({
        previous: true,
        requested: false,
        responded: true,
        status: 500,
        body: { error: 'memory_purge_failed' },
      })
    ).toEqual({ action: 'keep_off_retry', enabled: false });
  });

  it('successo: applica il valore richiesto', () => {
    expect(
      interpretAiFeaturesToggleResponse({
        previous: true,
        requested: false,
        responded: true,
        status: 200,
        body: { ok: true } as { error?: string },
      })
    ).toEqual({ action: 'apply', enabled: false });
  });

  it('altro errore HTTP: ripristina', () => {
    expect(
      interpretAiFeaturesToggleResponse({
        previous: false,
        requested: true,
        responded: true,
        status: 500,
        body: { error: 'profile_update_failed' },
      })
    ).toEqual({ action: 'restore', enabled: false });
  });
});

describe('requestAiFeaturesToggle', () => {
  it('segnala responded false se fetch lancia', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const out = await requestAiFeaturesToggle({
      enabled: false,
      accessToken: 't',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual({ responded: false });
  });

  it('passa status e body quando la route risponde', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 500,
      json: async () => ({ error: 'memory_purge_failed' }),
    });
    const out = await requestAiFeaturesToggle({
      enabled: false,
      accessToken: 't',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toEqual({
      responded: true,
      status: 500,
      body: { error: 'memory_purge_failed' },
    });
  });
});
