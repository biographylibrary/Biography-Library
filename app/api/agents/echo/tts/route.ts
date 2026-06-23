import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { synthesizeKokoroSpeech } from '@/lib/echo/kokoro-tts';
import { isEchoTtsConfigured } from '@/lib/echo/voice-config';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    configured: isEchoTtsConfigured(),
    provider: 'kokoro',
    region: 'eu-self-hosted',
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isEchoTtsConfigured()) {
    return NextResponse.json(
      {
        error: 'tts_not_configured',
        hint: 'Set ECHO_TTS_BASE_URL to your Kokoro server (see docs/ECHO_VOICE.md). Browser TTS is used as fallback.',
      },
      { status: 503 }
    );
  }

  let body: { text?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const language = body.language ?? 'en';

  try {
    const audio = await synthesizeKokoroSpeech(text, language);
    if (!audio) {
      return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
    }

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[echo/tts]', err);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
  }
}
