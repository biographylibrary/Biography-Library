import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agents/agent-chat-handler';
import { checkAgentRateLimit } from '@/lib/agents/thread-service';
import { echoTtsModel, isEchoTtsConfigured } from '@/lib/echo/voice-config';
import { MAX_INPUT_CHARS, synthesizeVoxtralSpeech } from '@/lib/echo/voxtral-tts';
import { recordAiUsage } from '@/lib/ai/usage-recorder';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { isPlatformStaffRole } from '@/lib/server/staff-roles';
import type { UserRole } from '@/lib/auth-context';

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

  const { data: staffProfile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle();

  const rateLimit = await checkAgentRateLimit(serviceClient, auth.userId, {
    skip: isPlatformStaffRole(staffProfile?.role as UserRole | undefined),
  });
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

  // Sintesi vocale su Mistral (Voxtral), non su Infomaniak: si registrano i
  // caratteri inviati, l'unità di fatturazione del fornitore, non token.
  const sentChars = Math.min(text.length, MAX_INPUT_CHARS);
  const recordTts = (ok: boolean) =>
    recordAiUsage({
      purpose: 'tts',
      userId: auth.userId,
      model: echoTtsModel(),
      usageUnit: 'characters',
      usageUnits: sentChars,
      ok,
    });

  try {
    const audio = await synthesizeVoxtralSpeech(text, language);
    if (!audio) {
      await recordTts(false);
      return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
    }
    await recordTts(true);

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[echo/tts]', err);
    await recordTts(false);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
  }
}
