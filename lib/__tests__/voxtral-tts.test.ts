import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const speechComplete = vi.fn();

vi.mock('@mistralai/mistralai', () => ({
  Mistral: class MockMistral {
    audio = {
      speech: {
        complete: (...args: unknown[]) => speechComplete(...args),
      },
    };
    constructor(_opts: { apiKey: string }) {}
  },
}));

describe('synthesizeVoxtralSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.MISTRAL_API_KEY;
    delete process.env.ECHO_TTS_VOICE_IT;
  });

  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
    delete process.env.ECHO_TTS_VOICE_IT;
  });

  it('returns null when MISTRAL_API_KEY is missing', async () => {
    const { synthesizeVoxtralSpeech } = await import('@/lib/echo/voxtral-tts');
    const result = await synthesizeVoxtralSpeech('Hello world', 'en');
    expect(result).toBeNull();
    expect(speechComplete).not.toHaveBeenCalled();
  });

  it('returns ArrayBuffer for valid input', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    const payload = Buffer.from('audio-bytes').toString('base64');
    speechComplete.mockResolvedValue({ audioData: payload });

    const { synthesizeVoxtralSpeech } = await import('@/lib/echo/voxtral-tts');
    const result = await synthesizeVoxtralSpeech('Ciao mondo', 'it');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect((result as ArrayBuffer).byteLength).toBeGreaterThan(0);
  });

  it('returns null on API error without throwing', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    speechComplete.mockRejectedValue(new Error('rate limit exceeded'));

    const { synthesizeVoxtralSpeech } = await import('@/lib/echo/voxtral-tts');
    await expect(synthesizeVoxtralSpeech('Hello', 'en')).resolves.toBeNull();
  });

  it('retries with fallback voice when configured voice is invalid', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    process.env.ECHO_TTS_VOICE_IT = 'invalid_voice_slug';
    const payload = Buffer.from('fallback-audio').toString('base64');

    speechComplete
      .mockRejectedValueOnce({ message: 'voice not found' })
      .mockResolvedValueOnce({ audioData: payload });

    const { synthesizeVoxtralSpeech } = await import('@/lib/echo/voxtral-tts');
    const result = await synthesizeVoxtralSpeech('Ciao', 'it');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(speechComplete).toHaveBeenCalledTimes(2);
    expect(speechComplete.mock.calls[1][0]).toMatchObject({ voiceId: 'en_paul_neutral' });
  });

  it('returns null for blank text', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    const { synthesizeVoxtralSpeech } = await import('@/lib/echo/voxtral-tts');
    expect(await synthesizeVoxtralSpeech('   ', 'en')).toBeNull();
  });
});
