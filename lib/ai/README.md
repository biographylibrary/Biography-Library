# AI Provider Abstraction Layer

This directory contains the AI provider abstraction layer for the Biography Library application.

## Files

- **ai-provider.ts** - Core abstraction layer with interfaces and implementations
- **ai-provider-usage.md** - Comprehensive usage documentation
- **example-usage.ts** - Code examples for common AI operations
- **next-section-recommender.ts** - Smart section recommendation logic
- **smart-followup.ts** - Intelligent follow-up question generation

## Quick Start

### 1. Configure your provider

In `.env`:
```bash
NEXT_PUBLIC_AI_PROVIDER=claude  # or 'euria'
```

### 2. Use in your code

```typescript
import { aiService } from '@/lib/ai/ai-provider';

// Check grammar
const suggestions = await aiService.checkGrammar(
  token,
  'Early Life',
  content,
  'en'
);

// Get guided prompts
const prompts = await aiService.getGuidedPrompts(
  token,
  'childhood',
  'Early Life',
  'en'
);

// Generate summary
const summary = await aiService.getSummary(
  token,
  'Early Life',
  content,
  'en'
);
```

## Supported Providers

### Claude (Anthropic)
**Status**: ✅ Fully implemented

Configuration in Supabase Edge Function secrets:
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_api_key
```

Frontend configuration (optional):
```bash
NEXT_PUBLIC_AI_PROVIDER=claude
```

Features:
- Grammar checking with detailed explanations
- Guided writing prompts
- Content summarization
- Multi-language support (EN, IT, FR, DE)
- Smart follow-up questions
- Section recommendations
- Content rewriting

### Euria (Infomaniak)
**Status**: ✅ Fully implemented

Configuration in Supabase Edge Function secrets:
```bash
AI_PROVIDER=euria
EURIA_API_KEY=your_api_key
EURIA_API_URL=https://api.infomaniak.com/1/ai/chat
```

Frontend configuration (optional):
```bash
NEXT_PUBLIC_AI_PROVIDER=euria
```

Features:
- Grammar checking with detailed explanations
- Guided writing prompts
- Content summarization
- Multi-language support (EN, IT, FR, DE)
- Smart follow-up questions
- Section recommendations
- Content rewriting

## Architecture

```
┌─────────────────────────────────────┐
│   Application Components            │
│   - Biography Editor                │
│   - AI Suggestions Panel            │
│   - Conversation Mode               │
└──────────────┬──────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   AI Service Layer                   │
│   lib/ai-service.ts                  │
│   lib/ai/smart-followup.ts           │
│   lib/ai/next-section-recommender.ts │
│   (Backward compatible wrappers)     │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   AI Provider Interface              │
│   lib/ai/ai-provider.ts              │
│   - ClaudeProvider                   │
│   - EuriaProvider                    │
│   (Both call edge function)          │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   Supabase Edge Function             │
│   supabase/functions/ai-assistant    │
│   ┌────────────────────────────────┐ │
│   │  Provider Router               │ │
│   │  (AI_PROVIDER env var)         │ │
│   └──────────┬─────────────────────┘ │
│              │                        │
│       ┌──────┴──────┐                │
│       ↓             ↓                │
│  ┌─────────┐  ┌─────────┐           │
│  │ Claude  │  │ Euria   │           │
│  │ Handler │  │ Handler │           │
│  └────┬────┘  └────┬────┘           │
│       │            │                │
└───────┼────────────┼────────────────┘
        │            │
        ↓            ↓
┌───────────────┐ ┌──────────────┐
│ Anthropic API │ │ Infomaniak   │
│ (Claude)      │ │ Euria API    │
└───────────────┘ └──────────────┘
```

### Key Design Decisions

1. **Provider Selection in Edge Function**: The edge function reads `AI_PROVIDER` env var and routes to the correct API. This keeps API keys secure and allows switching without code changes.

2. **Unified Interface**: Both ClaudeProvider and EuriaProvider call the same edge function URL. The edge function handles routing internally.

3. **Backward Compatibility**: Existing code using `ai-service.ts` functions continues to work without modification.

4. **Security**: API keys never leave the server. All AI requests go through authenticated edge function.

## Key Interfaces

### AIProvider
Main interface that all providers must implement:
- `checkGrammar()` - Grammar and style suggestions
- `getGuidedPrompts()` - Writing prompts for sections
- `getSummary()` - Content summarization
- `suggestImprovements()` - Detailed improvement suggestions
- `improveGrammar()` - Direct grammar improvement
- `rewriteSection()` - Rewrite with different tone
- `suggestTitles()` - Biography title suggestions

### Improvement
Type definition for AI improvement suggestions:
```typescript
interface Improvement {
  type: 'clarity' | 'detail' | 'flow' | 'style' | 'structure';
  original: string;
  suggestion: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}
```

## Adding a New Provider

1. Create a new class implementing `AIProvider`
2. Implement all required methods
3. Add to factory function in `ai-provider.ts`
4. Update environment variable documentation
5. Add tests

Example:
```typescript
class MyNewProvider implements AIProvider {
  async checkGrammar(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ) {
    // Your implementation
  }

  // Implement other methods...
}

// Add to factory
export function getAIProvider(): AIProvider {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'claude';

  switch (provider.toLowerCase()) {
    case 'mynewprovider':
      return new MyNewProvider();
    case 'euria':
      return new EuriaProvider();
    case 'claude':
    default:
      return new ClaudeProvider();
  }
}
```

## Benefits

1. **Vendor Independence** - Not locked to a single AI provider
2. **Easy Switching** - Change providers with one environment variable
3. **Cost Optimization** - Choose providers based on cost/performance
4. **Graceful Degradation** - Can implement fallback logic
5. **Testing** - Easy to mock for unit tests
6. **Future-Proof** - Add new providers without refactoring

## Switching Between Providers

### How It Works

The system uses a **two-layer** provider selection:

1. **Edge Function Layer** (Server-side) - The actual AI backend
   - Controlled by `AI_PROVIDER` environment variable in Supabase Edge Function secrets
   - This is what **actually** determines which API (Claude or Euria) gets called
   - Keeps API keys secure on the server

2. **Frontend Layer** (Client-side) - Optional provider class selection
   - Controlled by `NEXT_PUBLIC_AI_PROVIDER` environment variable
   - Both `ClaudeProvider` and `EuriaProvider` call the same edge function
   - Mainly for future extensibility

### To Switch from Claude to Euria:

1. **Add Euria API key to Supabase Edge Function secrets**:
   ```bash
   EURIA_API_KEY=your_actual_euria_key
   EURIA_API_URL=https://api.infomaniak.com/1/ai/chat
   ```

2. **Change the AI provider in Edge Function secrets**:
   ```bash
   AI_PROVIDER=euria
   ```

3. **(Optional) Update frontend provider**:
   ```bash
   NEXT_PUBLIC_AI_PROVIDER=euria
   ```

4. **Redeploy edge function** if you made changes

That's it! The application will now use Euria instead of Claude.

### To Switch Back to Claude:

Simply change the edge function secret:
```bash
AI_PROVIDER=claude
```

No code changes needed!

## Testing

To test different providers:

```bash
# Test with Claude (set in Supabase Edge Function secrets)
AI_PROVIDER=claude

# Test with Euria (set in Supabase Edge Function secrets)
AI_PROVIDER=euria
```

**Note**: The `NEXT_PUBLIC_AI_PROVIDER` variable is optional and doesn't affect which API is actually called. The edge function's `AI_PROVIDER` variable is what matters.

## Migration from Old Code

Old approach:
```typescript
import { checkGrammar } from '@/lib/ai-service';
const result = await checkGrammar(token, title, content, lang);
```

New approach (optional, old still works):
```typescript
import { aiService } from '@/lib/ai/ai-provider';
const result = await aiService.checkGrammar(token, title, content, lang);
```

The old `ai-service.ts` functions now use the abstraction internally, so existing code continues to work without changes.

## Language Support

All providers must support:
- English (en)
- Italian (it)
- French (fr)
- German (de)

Language is passed as a parameter to all methods and should affect:
- Response language
- Grammar checking rules
- Cultural context in suggestions

## Error Handling

All provider methods should:
1. Throw descriptive errors
2. Include error context
3. Handle rate limits gracefully
4. Provide fallback behavior when possible

Example:
```typescript
try {
  const result = await aiService.checkGrammar(token, title, content, lang);
  return result;
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Show user-friendly rate limit message
  } else if (error.message.includes('not configured')) {
    // Show setup instructions
  } else {
    // Generic error handling
  }
  throw error;
}
```

## Performance Considerations

- Methods are async and may take 1-5 seconds
- Implement loading states in UI
- Consider caching frequently requested data
- Rate limiting is handled at the edge function level
- Token limits vary by provider

## Security

- API keys are stored in environment variables
- Edge functions validate authentication tokens
- Rate limiting prevents abuse
- User data is not stored by AI providers
- All requests go through Supabase for authentication

## Further Reading

- [AI Provider Usage Guide](./ai-provider-usage.md) - Detailed usage examples
- [Example Code](./example-usage.ts) - Working code samples
- [Next Section Recommender](./next-section-recommender.ts) - Smart recommendations
- [Smart Follow-up](./smart-followup.ts) - Conversation intelligence
