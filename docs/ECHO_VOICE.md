# Echo Voice — architecture decision

**Status:** v2 (June 2026)  
**Goal:** Natural bidirectional voice for Echo — user speaks, Echo answers with voice + text, data stays in Europe on open-source models.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Does Infomaniak offer Realtime (duplex WebSocket)? | **No** |
| Does Infomaniak offer TTS? | **No** (only Whisper STT on catalog) |
| Do we leave Infomaniak entirely? | **No** — keep Infomaniak for **LLM brain** + **Whisper STT** (already in CH) |
| Where do we leave Infomaniak? | **TTS only** — self-host **Kokoro-82M** in EU |
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
       └────────────────────│ Kokoro-82M (EU)  │ ◄────────────│ POST /api/   │
                            │ self-hosted Docker│              │ agents/echo/tts│
                            └──────────────────┘              └──────────────┘
```

### Layer 1 — Ears (STT): Infomaniak Whisper ✅

- **Model:** Whisper V3 (open source)
- **Region:** Switzerland (Infomaniak Euria)
- **Path:** Browser `MediaRecorder` → Supabase Edge `audio-transcription` → Infomaniak async API
- **Already used** by section editor `VoiceRecorder`
- **Latency:** ~2–4 s per utterance (batch, not streaming)
- **Languages:** IT, EN, FR, DE (app UI languages)

**Why not Scaleway Whisper?** Valid EU alternative (Paris). We keep Infomaniak because it is already integrated, billed, and aligned with the privacy policy. Switch via env if needed later.

**Why not Web Speech API as primary?** On Chrome, audio is processed by Google — conflicts with “no US cloud” privacy story. Kept only as emergency fallback if Whisper fails.

### Layer 2 — Brain: Infomaniak LLM ✅ (unchanged)

- `POST /api/agents/chat/stream` with `agentType: 'echo'`
- Text streaming via SSE; tool calls for onboarding, drafts, path change, etc.

### Layer 3 — Mouth (TTS): Kokoro-82M self-hosted 🇪🇺

- **Model:** [Kokoro-82M](https://github.com/hexgrad/kokoro) — **Apache-2.0** (commercial use OK)
- **Hosting:** Docker on Infomaniak Jelastic (same org, EU) or Exoscale FR — **your infra, your data**
- **API:** OpenAI-compatible `POST /v1/audio/speech`
- **Voices:** `if_sara` (IT), `af_bella` (EN), `ff_siwis` (FR); DE uses EN voice (Kokoro has no DE pack yet)
- **Latency:** ~1–2 s for typical Echo reply on CPU; streaming supported by Kokoro server
- **Proxy:** `POST /api/agents/echo/tts` (authenticated, rate-limited via existing agent auth)

**Why Kokoro over Piper / XTTS?**

| Model | License | Commercial | Quality | CPU |
|-------|---------|------------|---------|-----|
| Kokoro-82M | Apache-2.0 | ✅ | Good, multilingual | ✅ |
| Piper | MIT | ✅ | OK, many locales | ✅ |
| XTTS v2 | CPML non-commercial | ❌ | Best cloning | GPU |

**Why not Infomaniak for TTS?** Catalog lists only Whisper under “Audio”. Marketing mentions “human voices” but no TTS endpoint is exposed.

**Why not OpenAI Realtime?** US cloud, proprietary, not open source — out of scope per product requirements.

### Layer 4 — Fallback: browser `speechSynthesis`

Used when `ECHO_TTS_BASE_URL` is unset or Kokoro is down. Quality varies by OS; no server cost.

---

## What we explicitly do *not* build (v2)

- Full-duplex WebSocket realtime (OpenAI Realtime style)
- Streaming STT (would need Deepgram/AssemblyAI — US vendors)
- Voice cloning / custom Echo voice (future v3)

---

## Implementation map

| File | Role |
|------|------|
| `components/echo/EchoVoiceSession.tsx` | Push-to-talk mic → Whisper |
| `lib/echo/whisper-stt.ts` | Client → `audio-transcription` |
| `lib/echo/echo-playback.ts` | Kokoro playback + browser fallback |
| `lib/echo/kokoro-tts.ts` | Server → Kokoro API |
| `app/api/agents/echo/tts/route.ts` | Authenticated TTS proxy |
| `app/api/agents/echo/voice/route.ts` | Reserved for future WebSocket (501) |

---

## Deploy Kokoro on Jelastic (recommended)

Run a second lightweight container alongside Next.js:

```bash
docker run -d \
  --name echo-kokoro \
  -p 127.0.0.1:8880:8880 \
  -v kokoro-cache:/cache \
  --restart unless-stopped \
  hwdsl2/kokoro-server
```

Point the Next.js app (internal network):

```env
ECHO_TTS_BASE_URL=http://echo-kokoro:8880/v1
ECHO_TTS_VOICE_IT=if_sara
ECHO_TTS_VOICE_EN=af_bella
ECHO_TTS_VOICE_FR=ff_siwis
ECHO_TTS_VOICE_DE=af_bella
```

Health check: `GET /api/agents/echo/tts` → `{ "configured": true, "provider": "kokoro" }`

Test synthesis:

```bash
curl -s -X POST http://localhost:8880/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"tts-1","input":"Ciao, sono Echo.","voice":"if_sara","response_format":"mp3"}' \
  -o test.mp3
```

### Alternatives (same API shape)

- `ghcr.io/remsky/kokoro-fastapi-cpu` — more features, slightly heavier
- `lobstersyrup/kokoro-tts` — minimal CPU image
- **Exoscale** dedicated instance if Jelastic CPU is tight

---

## Environment variables

```env
# Required for server TTS (Kokoro). If unset, browser speechSynthesis is used.
ECHO_TTS_BASE_URL=http://127.0.0.1:8880/v1
ECHO_TTS_API_KEY=                    # optional, if Kokoro is behind auth
ECHO_TTS_VOICE_IT=if_sara
ECHO_TTS_VOICE_EN=af_bella
ECHO_TTS_VOICE_FR=ff_siwis
ECHO_TTS_VOICE_DE=af_bella

# STT uses existing Supabase secrets (no new vars):
# INFOMANIAK_AI_TOKEN, INFOMANIAK_AI_ENDPOINT → audio-transcription
```

---

## User experience

1. User **taps mic** → orb `listening`, red recording state
2. User **taps again** → orb `thinking`, Whisper transcribes
3. Text sent to Echo → LLM streams reply
4. Reply complete → orb `speaking`, Kokoro plays MP3 (or browser TTS)
5. Transcript always visible in chat

**Safari / iOS:** Same flow (MediaRecorder + Whisper). No dependency on `webkitSpeechRecognition`.

---

## Future v3 (optional)

- Sentence-chunked TTS while LLM still streams (lower time-to-first-audio)
- Dedicated Echo voice fine-tune on licensed dataset
- Streaming STT if a **EU-hosted** streaming Whisper fork becomes available
- WebSocket route at `/api/agents/echo/voice` when a sovereign realtime stack exists
