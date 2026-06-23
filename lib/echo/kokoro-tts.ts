import { kokoroVoiceForLanguage } from '@/lib/echo/voice-config';

const MAX_INPUT_CHARS = 4096;

export async function synthesizeKokoroSpeech(
  text: string,
  language: string
): Promise<ArrayBuffer | null> {
  const baseUrl = process.env.ECHO_TTS_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return null;

  const input = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!input) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = process.env.ECHO_TTS_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'tts-1',
      input,
      voice: kokoroVoiceForLanguage(language),
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    console.error('[kokoro-tts] synthesis failed:', res.status, await res.text().catch(() => ''));
    return null;
  }

  return res.arrayBuffer();
}
