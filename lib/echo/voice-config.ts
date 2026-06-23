/** ISO-639-1 codes accepted by Infomaniak Whisper. */
export const ECHO_WHISPER_LANGUAGES = ['en', 'it', 'fr', 'de'] as const;
export type EchoWhisperLanguage = (typeof ECHO_WHISPER_LANGUAGES)[number];

export function echoWhisperLanguage(appLanguage: string): EchoWhisperLanguage {
  const code = appLanguage.slice(0, 2).toLowerCase();
  if (ECHO_WHISPER_LANGUAGES.includes(code as EchoWhisperLanguage)) {
    return code as EchoWhisperLanguage;
  }
  return 'en';
}

/** Kokoro voice IDs — Apache-2.0 model, see docs/ECHO_VOICE.md */
export function kokoroVoiceForLanguage(appLanguage: string): string {
  const code = appLanguage.slice(0, 2).toLowerCase();
  const envMap: Record<string, string | undefined> = {
    it: process.env.ECHO_TTS_VOICE_IT,
    en: process.env.ECHO_TTS_VOICE_EN,
    fr: process.env.ECHO_TTS_VOICE_FR,
    de: process.env.ECHO_TTS_VOICE_DE,
  };
  const defaults: Record<string, string> = {
    it: 'if_sara',
    en: 'af_bella',
    fr: 'ff_siwis',
    de: 'af_bella', // Kokoro has no DE voice pack — English fallback
  };
  return envMap[code] ?? defaults[code] ?? defaults.en;
}

export function isEchoTtsConfigured(): boolean {
  return Boolean(process.env.ECHO_TTS_BASE_URL?.trim());
}
