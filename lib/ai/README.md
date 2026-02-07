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

Configuration:
```bash
NEXT_PUBLIC_AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_api_key
```

Features:
- Grammar checking with detailed explanations
- Guided writing prompts
- Content summarization
- Multi-language support (EN, IT, FR, DE)

### Euria (Infomaniak)
**Status**: ⏳ Coming soon

Configuration:
```bash
NEXT_PUBLIC_AI_PROVIDER=euria
EURIA_API_KEY=your_api_key
EURIA_API_URL=https://api.infomaniak.com/1/ai/chat
```

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
│   (Backward compatible wrapper)      │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│   AI Provider Interface              │
│   lib/ai/ai-provider.ts              │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌───────────────┐ ┌──────────────┐
│ ClaudeProvider│ │EuriaProvider │
│   (Active)    │ │  (Planned)   │
└───────┬───────┘ └──────┬───────┘
        │                │
        ↓                ↓
┌───────────────┐ ┌──────────────┐
│ Supabase Edge │ │ Euria API    │
│   Function    │ │              │
└───────┬───────┘ └──────────────┘
        │
        ↓
┌───────────────┐
│ Anthropic API │
│ (Claude)      │
└───────────────┘
```

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

## Testing

To test different providers:

```bash
# Test with Claude
NEXT_PUBLIC_AI_PROVIDER=claude npm run dev

# Test with Euria (when available)
NEXT_PUBLIC_AI_PROVIDER=euria npm run dev
```

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
