import { NextResponse } from 'next/server';

/**
 * Reserved for full-duplex realtime voice. Current stack: Whisper STT + Voxtral TTS — see docs/ECHO_VOICE.md.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Realtime voice WebSocket not enabled',
      hint: 'Push-to-talk uses Whisper STT + Mistral Voxtral TTS. See docs/ECHO_VOICE.md',
      ttsStatus: '/api/agents/echo/tts',
    },
    { status: 501 }
  );
}
