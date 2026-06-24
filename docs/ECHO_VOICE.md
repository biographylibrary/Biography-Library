# Echo Voice — architecture decision

**Status:** v3 (June 2026)  
**Goal:** Natural bidirectional voice for Echo — user speaks, Echo answers with voice + text, data stays in Europe.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Does Infomaniak offer Realtime (duplex WebSocket)? | **No** |
| Does Infomaniak offer TTS? | **No** (only Whisper STT on catalog) |
| Do we leave Infomaniak entirely? | **No** — keep Infomaniak for **LLM brain** + **Whisper STT** (already in CH) |
| TTS | **Mistral Voxtral TTS** via La Plateforme API (France/EU) |
| Is this “realtime” like OpenAI Realtime? | **No** — turn-based (~3–6 s/turn). Good enough for biography coaching. |

---

## Chosen stack: “Echo Voice Europe”

```
┌─────────────┐   hold mic    ┌──────────────────┐   text    ┌─────────────────┐
│   Browser   │ ────────────► │ Whisper V3 (CH)  │ ────────► │ Echo LLM (CH)   │
│ MediaRecorder│  webm blob   │ Infomaniak via   │           │ Infomaniak SSE  │
│             │               │ audio-transcription│         │ agentType=echo  │
└─────────────┘               └──────────────────┘           └────────┬────────┘
       ▲                                                              │ text
       │ mp3 playback                                                ▼
       │                    ┌──────────────────┐              ┌──────────────┐
       └────────────────────│ Voxtral TTS (FR) │ ◄────────────│ POST /api/   │
                            │ Mistral API      │              │ agents/echo/tts│
                            └──────────────────┘              └──────────────┘
```

### Layer 1 — Ears (STT): Infomaniak Whisper ✅

- **Model:** Whisper V3 (open source)
- **Region:** Switzerland (Infomaniak Euria)
- **Path:** Browser `MediaRecorder` → Supabase Edge `audio-transcription` → Infomaniak async API
- **Latency:** ~2–4 s per utterance (batch, not streaming)
- **Languages:** IT, EN, FR, DE (app UI languages)

Web Speech API is emergency fallback only (Chrome sends audio to Google).

### Layer 2 — Brain: Infomaniak LLM ✅ (unchanged)

- `POST /api/agents/chat/stream` with `agentType: 'echo'`
- Text streaming via SSE; tool calls for onboarding, drafts, path change, etc.

### Layer 3 — Mouth (TTS): Mistral Voxtral 🇪🇺

- **Model:** `voxtral-mini-tts-2603` (configurable via `ECHO_TTS_MODEL`)
- **Region:** France — Mistral La Plateforme (EU)
- **API:** `@mistralai/mistralai` → `client.audio.speech.complete()`
- **Voices:** Mistral voice **slug** or UUID (`ECHO_TTS_VOICE_*`). Default: `en_paul_neutral` for all UI languages. List presets: `client.audio.voices.list()` or La Plateforme dashboard.
- **Latency:** ~1–2 s for typical Echo reply
- **Proxy:** `POST /api/agents/echo/tts` (authenticated; returns `audio/mpeg`)
- **Cost:** ~$0.016 per 1,000 characters (~$0.011/min of Echo speech at ~700 chars/min)

**Invalid voice slugs** (e.g. `it_paul_neutral`) are retried automatically with `en_paul_neutral`.

### Layer 4 — Fallback: browser `speechSynthesis`

Used when `MISTRAL_API_KEY` is unset or server synthesis fails. Quality varies by OS; no server cost.

---

## Environment variables

```env
MISTRAL_API_KEY=
ECHO_TTS_MODEL=voxtral-mini-tts-2603

# Optional — defaults to en_paul_neutral
ECHO_TTS_VOICE=en_paul_neutral
ECHO_TTS_VOICE_IT=en_paul_neutral
ECHO_TTS_VOICE_EN=en_paul_neutral
ECHO_TTS_VOICE_FR=en_paul_neutral
ECHO_TTS_VOICE_DE=en_paul_neutral

# STT uses existing Supabase secrets (no new vars):
# INFOMANIAK_AI_TOKEN, INFOMANIAK_AI_ENDPOINT → audio-transcription
```

Health check: `GET /api/agents/echo/tts` → `{ "configured": true, "provider": "voxtral", "region": "eu-mistral" }`

---

## Implementation map

| File | Role |
|------|------|
| `components/echo/EchoVoiceSession.tsx` | Push-to-talk mic → Whisper |
| `lib/echo/whisper-stt.ts` | Client → `audio-transcription` |
| `lib/echo/echo-playback.ts` | Voxtral playback + browser fallback |
| `lib/echo/voxtral-tts.ts` | Server → Mistral Voxtral API |
| `lib/echo/voice-config.ts` | Voice slugs, config checks |
| `app/api/agents/echo/tts/route.ts` | Authenticated TTS proxy |
| `app/api/agents/echo/voice/route.ts` | Reserved for future WebSocket (501) |

---

## User experience

1. User **taps mic** → orb `listening`
2. User **taps again** → orb `thinking`, Whisper transcribes
3. Text sent to Echo → LLM streams reply
4. Reply complete → orb `speaking`, Voxtral plays MP3 (or browser TTS on failure)
5. Transcript always visible in chat

---

## Future (optional)

- Sentence-chunked TTS while LLM still streams
- Full-duplex realtime when a sovereign stack exists
- Streaming STT if EU-hosted streaming Whisper becomes available
