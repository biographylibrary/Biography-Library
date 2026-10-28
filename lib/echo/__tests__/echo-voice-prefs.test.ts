// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ECHO_VOICE_OUTPUT_DEFAULT,
  getEchoVoiceOutputEnabled,
  setEchoVoiceOutputEnabled,
} from '@/lib/echo/echo-voice-prefs';
import { speakEchoReply } from '@/lib/echo/echo-playback';

/**
 * La voce di Echo che legge le risposte è spenta finché non la si accende: ogni risposta letta è una
 * chiamata al servizio vocale e un'attesa, e la maggior parte di chi scrive vuole solo il testo.
 */
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('preferenza «voce di Echo»', () => {
  it('di default è spenta', () => {
    expect(ECHO_VOICE_OUTPUT_DEFAULT).toBe(false);
    expect(getEchoVoiceOutputEnabled()).toBe(false);
  });

  it('la scelta fatta resta, accesa o spenta', () => {
    setEchoVoiceOutputEnabled(true);
    expect(getEchoVoiceOutputEnabled()).toBe(true);
    setEchoVoiceOutputEnabled(false);
    expect(getEchoVoiceOutputEnabled()).toBe(false);
  });

  it('chi l\'aveva già accesa la ritrova accesa', () => {
    localStorage.setItem('echo-voice-output-enabled', 'true');
    expect(getEchoVoiceOutputEnabled()).toBe(true);
  });

  it('se l\'archivio del browser non si può leggere vale il predefinito, senza errori', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloccato');
    });
    expect(getEchoVoiceOutputEnabled()).toBe(false);
  });

  it('se non si può salvare, non va in errore', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloccato');
    });
    expect(() => setEchoVoiceOutputEnabled(true)).not.toThrow();
  });
});

describe('di default Echo non legge e non chiama il servizio vocale', () => {
  it('speakEchoReply non fa nessuna richiesta né usa la voce del browser', async () => {
    const fetchMock = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] });
    const backend = await speakEchoReply('Ciao, questa è la risposta.', 'it', { accessToken: 'token' });
    expect(backend).toBe('none');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });

  it('con la voce accesa dal pulsante, la richiesta al servizio vocale parte', async () => {
    setEchoVoiceOutputEnabled(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      blob: async () => new Blob(),
    });
    vi.stubGlobal('fetch', fetchMock);
    // Se il servizio vocale non risponde, Echo ripiega sulla voce del browser: qui finta e immediata.
    class FakeUtterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', {
      speak: (u: FakeUtterance) => u.onend?.(),
      cancel: vi.fn(),
      getVoices: () => [],
    });
    await speakEchoReply('Ciao, questa è la risposta.', 'it', { accessToken: 'token' });
    expect(fetchMock).toHaveBeenCalledWith('/api/agents/echo/tts', expect.objectContaining({ method: 'POST' }));
  });
});
