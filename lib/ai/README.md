# AI Service - Infomaniak Integration

This directory contains the AI service integration for the Biography Library application, powered by Infomaniak AI Tools (Mistral3).

## Architecture

```
Application Components
       ↓
lib/ai-service.ts (calls edge function)
       ↓
lib/ai/ai-provider.ts (wraps edge function calls)
       ↓
Supabase Edge Function (ai-assistant)
       ↓
Infomaniak AI Tools API (Mistral3)
```

## Configuration

The edge function requires the following environment variables (configured in Supabase Edge Function secrets):

- `INFOMANIAK_AI_TOKEN` (required) - Your Infomaniak AI API token
- `INFOMANIAK_AI_ENDPOINT` (optional) - API endpoint, defaults to Infomaniak AI Tools v1
- `INFOMANIAK_AI_MODEL` (optional) - AI model, defaults to mistral3

## Usage

### From Application Code

Import from the abstraction layer:

```typescript
import { aiService } from '@/lib/ai/ai-provider';

const suggestions = await aiService.checkGrammar(
  token,
  'Early Life',
  content,
  'en'
);

const prompts = await aiService.getGuidedPrompts(
  token,
  'childhood',
  'Early Life',
  'en'
);

const summary = await aiService.getSummary(
  token,
  'Early Life',
  content,
  'en'
);
```

### Supported Features

All AI features are powered by Infomaniak AI Tools:

- Grammar and style checking
- Guided writing prompts for biography sections
- Content summarization
- Multi-language support (English, Italian, French, German)
- Smart follow-up questions in conversation mode
- Section recommendations
- Content rewriting with different tones

## Files

- **ai-service.ts** - New server-side AI service using Infomaniak directly
- **ai-provider.ts** - Provider abstraction that calls the edge function
- **example-usage.ts** - Code examples for common AI operations
- **next-section-recommender.ts** - Smart section recommendation logic
- **smart-followup.ts** - Intelligent follow-up question generation

## Security

- API tokens are stored securely in Supabase Edge Function secrets
- All requests are authenticated via Supabase auth
- Rate limiting prevents abuse (5 requests per minute per user)
- User content is processed securely through the edge function

## Language Support

All AI features support multiple languages:
- English (en)
- Italian (it)
- French (fr)
- German (de)

The AI responds in the requested language and applies language-specific grammar rules.

## Error Handling

The system provides clear error messages for common issues:

- **503 Service Unavailable**: Infomaniak AI token not configured
- **401 Unauthorized**: Invalid authentication token
- **429 Too Many Requests**: Rate limit exceeded
- **502 Bad Gateway**: AI service error

## Getting an Infomaniak AI Token

1. Sign up for Infomaniak AI Tools
2. Generate an API token from your Infomaniak dashboard
3. Add the token to Supabase Edge Function secrets as `INFOMANIAK_AI_TOKEN`

The edge function is automatically configured and will start working once the token is added.
