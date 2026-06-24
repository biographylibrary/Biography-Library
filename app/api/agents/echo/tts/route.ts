import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { checkAgentRateLimit } from '@/lib/agents/thread-service';
import { isEchoTtsConfigured } from '@/lib/echo/voice-config';
import { synthesizeVoxtralSpeech } from '@/lib/echo/voxtral-tts';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    configured: isEchoTtsConfigured(),
    provider: 'voxtral',
    region: 'eu-mistral',
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = buildServiceClient();
  const rateLimit = await checkAgentRateLimit(serviceClient, auth.userId);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!isEchoTtsConfigured()) {
    return NextResponse.json(
      {
        error: 'tts_not_configured',
        hint: 'Set MISTRAL_API_KEY (see docs/ECHO_VOICE.md). Browser TTS is used as fallback.',
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
    const audio = await synthesizeVoxtralSpeech(text, language);
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
