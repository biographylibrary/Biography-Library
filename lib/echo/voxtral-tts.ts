import { Mistral } from '@mistralai/mistralai';
import { echoTtsModel, echoVoiceIdForLanguage } from '@/lib/echo/voice-config';

const MAX_INPUT_CHARS = 4096;
const FALLBACK_VOICE = 'en_paul_neutral';

function mistralErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const body = (err as { body?: string }).body;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as { message?: string; type?: string };
        if (parsed.message) return parsed.message;
      } catch {
        return body.slice(0, 200);
      }
    }
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
  }
  return String(err);
}

function isInvalidVoiceError(err: unknown): boolean {
  const msg = mistralErrorMessage(err).toLowerCase();
  return msg.includes('not found') || msg.includes('invalid_voice');
}

async function synthesizeOnce(
  client: Mistral,
  input: string,
  voiceId: string
): Promise<ArrayBuffer> {
  const response = await client.audio.speech.complete({
    model: echoTtsModel(),
    input,
    voiceId,
    responseFormat: 'mp3',
    stream: false,
  });

  const audioData = 'audioData' in response ? response.audioData : null;
  if (!audioData) {
    throw new Error('no audio_data in response');
  }

  const buffer = Buffer.from(audioData, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export async function synthesizeVoxtralSpeech(
  text: string,
  language: string
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) return null;

  const input = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!input) return null;

  const voiceId = echoVoiceIdForLanguage(language);
  const client = new Mistral({ apiKey });

  try {
    return await synthesizeOnce(client, input, voiceId);
  } catch (err) {
    if (voiceId !== FALLBACK_VOICE && isInvalidVoiceError(err)) {
      console.warn(
        `[voxtral-tts] voice "${voiceId}" invalid, retrying with ${FALLBACK_VOICE}:`,
        mistralErrorMessage(err)
      );
      try {
        return await synthesizeOnce(client, input, FALLBACK_VOICE);
      } catch (retryErr) {
        console.error('[voxtral-tts] synthesis failed:', mistralErrorMessage(retryErr));
        return null;
      }
    }
    console.error(`[voxtral-tts] synthesis failed (voice=${voiceId}):`, mistralErrorMessage(err));
    return null;
  }
}
