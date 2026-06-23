import { NextResponse } from 'next/server';

/**
 * Reserved for full-duplex realtime voice (v3). v2 uses turn-based Whisper + Kokoro — see docs/ECHO_VOICE.md.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Realtime voice WebSocket not enabled',
      hint: 'v2 uses push-to-talk Whisper STT + Kokoro TTS. See docs/ECHO_VOICE.md',
      ttsStatus: '/api/agents/echo/tts',
    },
    { status: 501 }
  );
}
