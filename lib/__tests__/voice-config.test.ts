import { afterEach, describe, expect, it } from 'vitest';
import {
  echoTtsModel,
  echoVoiceIdForLanguage,
  echoWhisperLanguage,
  isEchoTtsConfigured,
} from '@/lib/echo/voice-config';

const ENV_KEYS = [
  'ECHO_TTS_MODEL',
  'ECHO_TTS_VOICE',
  'ECHO_TTS_VOICE_IT',
  'ECHO_TTS_VOICE_EN',
  'ECHO_TTS_VOICE_FR',
  'ECHO_TTS_VOICE_DE',
  'MISTRAL_API_KEY',
] as const;

describe('voice-config', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('falls back to default TTS model when env is missing', () => {
    expect(echoTtsModel()).toBe('voxtral-mini-tts-2603');
  });

  it('uses ECHO_TTS_MODEL when set', () => {
    process.env.ECHO_TTS_MODEL = 'custom-model';
    expect(echoTtsModel()).toBe('custom-model');
  });

  it('maps supported app languages to whisper codes', () => {
    expect(echoWhisperLanguage('it-IT')).toBe('it');
    expect(echoWhisperLanguage('fr')).toBe('fr');
    expect(echoWhisperLanguage('de-DE')).toBe('de');
    expect(echoWhisperLanguage('en-US')).toBe('en');
  });

  it('falls back whisper language to English for unsupported locales', () => {
    expect(echoWhisperLanguage('es-ES')).toBe('en');
  });

  it('uses default voice when per-language env vars are missing', () => {
    expect(echoVoiceIdForLanguage('it')).toBe('en_paul_neutral');
    expect(echoVoiceIdForLanguage('fr')).toBe('en_paul_neutral');
    expect(echoVoiceIdForLanguage('xx')).toBe('en_paul_neutral');
  });

  it('prefers global ECHO_TTS_VOICE over per-language voices', () => {
    process.env.ECHO_TTS_VOICE = 'global_voice';
    process.env.ECHO_TTS_VOICE_IT = 'it_voice';
    expect(echoVoiceIdForLanguage('it')).toBe('global_voice');
  });

  it('uses per-language voice env when global override is absent', () => {
    process.env.ECHO_TTS_VOICE_IT = 'it_custom_voice';
    expect(echoVoiceIdForLanguage('it')).toBe('it_custom_voice');
  });

  it('reports TTS as not configured without MISTRAL_API_KEY', () => {
    expect(isEchoTtsConfigured()).toBe(false);
  });

  it('reports TTS as configured when MISTRAL_API_KEY is set', () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    expect(isEchoTtsConfigured()).toBe(true);
  });
});
