import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { assertAiFeaturesEnabled } from '@/lib/server/require-ai-features';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

/**
 * Reserved for full-duplex realtime voice. Current stack: Whisper STT + Voxtral TTS — see docs/ECHO_VOICE.md.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const aiGate = await assertAiFeaturesEnabled(buildServiceClient(), auth.userId);
  if (!aiGate.ok) {
    return NextResponse.json({ error: aiGate.error }, { status: aiGate.status });
  }

  return NextResponse.json(
    {
      error: 'Realtime voice WebSocket not enabled',
      hint: 'Push-to-talk uses Whisper STT + Mistral Voxtral TTS. See docs/ECHO_VOICE.md',
      ttsStatus: '/api/agents/echo/tts',
    },
    { status: 501 }
  );
}
