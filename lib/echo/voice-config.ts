/** ISO-639-1 codes accepted by Infomaniak Whisper. */
export const ECHO_WHISPER_LANGUAGES = ['en', 'it', 'fr', 'de'] as const;
export type EchoWhisperLanguage = (typeof ECHO_WHISPER_LANGUAGES)[number];

export function echoTtsModel(): string {
  return process.env.ECHO_TTS_MODEL?.trim() || 'voxtral-mini-tts-2603';
}

export function echoWhisperLanguage(appLanguage: string): EchoWhisperLanguage {
  const code = appLanguage.slice(0, 2).toLowerCase();
  if (ECHO_WHISPER_LANGUAGES.includes(code as EchoWhisperLanguage)) {
    return code as EchoWhisperLanguage;
  }
  return 'en';
}

/**
 * Mistral voice slug or UUID for Voxtral TTS.
 * Preset slugs on La Plateforme use en_/gb_ prefixes (e.g. en_paul_neutral).
 * Env ECHO_TTS_VOICE_* overrides per language; ECHO_TTS_VOICE overrides all.
 */
export function echoVoiceIdForLanguage(appLanguage: string): string {
  const global = process.env.ECHO_TTS_VOICE?.trim();
  if (global) return global;

  const code = appLanguage.slice(0, 2).toLowerCase();
  const envMap: Record<string, string | undefined> = {
    it: process.env.ECHO_TTS_VOICE_IT,
    en: process.env.ECHO_TTS_VOICE_EN,
    fr: process.env.ECHO_TTS_VOICE_FR,
    de: process.env.ECHO_TTS_VOICE_DE,
  };
  const defaults: Record<string, string> = {
    it: 'en_paul_neutral',
    en: 'en_paul_neutral',
    fr: 'en_paul_neutral',
    de: 'en_paul_neutral',
  };
  return envMap[code]?.trim() || defaults[code] || defaults.en;
}

export function isEchoTtsConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY?.trim());
}
