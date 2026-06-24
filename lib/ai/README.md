# AI Service — Infomaniak Integration

AI features for Biography Library, powered by **Infomaniak AI Services** (OpenAI-compatible API, Switzerland).

## Architecture

```
Application Components
       ↓
lib/ai/ai-provider.ts → lib/ai/ai-client.ts
       ↓
Supabase Edge Function (ai-assistant)
       ↓
Infomaniak AI (default: google/gemma-4-31B-it)

Help chatbot:
components/help/HelpChatbot.tsx → help-assistant edge function
       ↓
Infomaniak AI (default: nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8)

Publication screening / draft review:
Next.js API routes → lib/server/review-submit-pipeline.ts
       ↓
Infomaniak AI (INFOMANIAK_AI_MODEL, default: google/gemma-4-31B-it)

Agent platform (beta):
/api/agents/* → lib/agents/infomaniak-client.ts
```

## Configuration

### Edge Functions (Supabase secrets)

| Secret | Function | Default in code |
| --- | --- | --- |
| `INFOMANIAK_AI_TOKEN` | all | — |
| `INFOMANIAK_AI_ENDPOINT` | all | — |
| `INFOMANIAK_AI_MODEL_PRIMARY` | ai-assistant | `google/gemma-4-31B-it` |
| `INFOMANIAK_AI_MODEL_FALLBACK` | ai-assistant | `mistralai/Mistral-Small-4-119B-2603` |
| `INFOMANIAK_AI_MODEL_HELP_PRIMARY` | help-assistant | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` |
| `INFOMANIAK_AI_MODEL_HELP_FALLBACK` | help-assistant | `mistralai/Ministral-3-14B-Instruct-2512` |

If secrets are unset, each function uses its code defaults. Old secrets (`Apertus`, `mistral3`) override defaults — update or remove them after deploy.

### Next.js (`.env.local` / Jelastic)

- `INFOMANIAK_AI_ENDPOINT`, `INFOMANIAK_AI_TOKEN`, `INFOMANIAK_AI_MODEL`
- `SUPABASE_SERVICE_ROLE_KEY` — required for `/api/review/submit` and `/api/agents/*`

## Usage

```typescript
import { aiService } from '@/lib/ai/ai-provider';

const suggestions = await aiService.checkGrammar(token, 'Early Life', content, 'en');
```

## Supported features

- Grammar and style checking
- Guided writing prompts
- Content summarization
- Multi-language (en, it, fr, de)
- Smart follow-up (`analyze-answer` action)
- Section recommendations, rewrite, theme analysis

## Security

- API tokens in server secrets / env only
- Supabase JWT on every edge call
- Rate limits: per-minute (`ai_rate_limits`) + daily/weekly (`ai_usage_tracking`)
- Agent routes: separate `agent_usage` quota

## Embeddings (RAG)

Model: `bge_multilingual_gemma2`, **3584 dimensions** (verified on Infomaniak product 107001).
