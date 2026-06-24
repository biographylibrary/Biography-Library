import { echoWhisperLanguage } from '@/lib/echo/voice-config';

export class EchoTranscriptionError extends Error {
  constructor(
    message: string,
    readonly code: 'unauthorized' | 'network' | 'empty' | 'server'
  ) {
    super(message);
    this.name = 'EchoTranscriptionError';
  }
}

/**
 * Transcribe a recorded audio blob via Supabase `audio-transcription` (Infomaniak Whisper, CH).
 */
export async function transcribeAudioWithWhisper(
  blob: Blob,
  appLanguage: string,
  accessToken: string
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new EchoTranscriptionError('Supabase is not configured', 'server');
  }

  const form = new FormData();
  form.append('file', blob, 'recording.webm');
  form.append('language', echoWhisperLanguage(appLanguage));

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/audio-transcription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Apikey: anonKey,
      },
      body: form,
    });
  } catch {
    throw new EchoTranscriptionError('Network error during transcription', 'network');
  }

  const json = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;

  if (res.status === 401) {
    throw new EchoTranscriptionError('Session expired', 'unauthorized');
  }

  if (!res.ok || !json) {
    throw new EchoTranscriptionError(json?.error ?? 'Transcription failed', 'server');
  }

  const text = (json.text ?? '').trim();
  if (!text) {
    throw new EchoTranscriptionError('No speech detected', 'empty');
  }

  return text;
}
