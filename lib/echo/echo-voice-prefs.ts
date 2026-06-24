const ECHO_VOICE_OUTPUT_KEY = 'echo-voice-output-enabled';

export function getEchoVoiceOutputEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(ECHO_VOICE_OUTPUT_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setEchoVoiceOutputEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ECHO_VOICE_OUTPUT_KEY, String(enabled));
}
