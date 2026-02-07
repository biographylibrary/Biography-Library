# AI Provider Abstraction Layer

This document explains how to use the AI provider abstraction layer to support multiple AI services.

## Overview

The AI provider abstraction layer allows the application to switch between different AI providers (Claude, Euria, etc.) without changing application code. This is achieved through a common interface that all providers implement.

## Architecture

```
Application Code
       ↓
  AI Service (lib/ai-service.ts)
       ↓
  AI Provider Interface (lib/ai/ai-provider.ts)
       ↓
  ┌──────────┬──────────┐
  ↓          ↓          ↓
Claude    Euria    (Future providers)
```

## Configuration

### Environment Variables

Set the AI provider in your `.env` file:

```bash
# Select AI provider: 'claude' or 'euria'
NEXT_PUBLIC_AI_PROVIDER=claude

# Claude/Anthropic (current default)
ANTHROPIC_API_KEY=your_api_key_here

# Infomaniak Euria (not yet implemented)
EURIA_API_KEY=your_euria_api_key_here
EURIA_API_URL=https://api.infomaniak.com/1/ai/chat
```

## Usage

### Using the Abstraction (Recommended)

For new features, import and use the `aiService` directly:

```typescript
import { aiService } from '@/lib/ai/ai-provider';

// Example: Generate a summary
const summary = await aiService.generateSummary(text, language);

// Example: Get grammar improvements
const improvements = await aiService.suggestImprovements(text, section, language);

// Example: Rewrite with different tone
const rewritten = await aiService.rewriteSection(text, 'formal', language);
```

### Using Existing Service (Backward Compatible)

The existing `ai-service.ts` has been updated to use the abstraction layer internally:

```typescript
import { checkGrammar, getGuidedPrompts, getSummary } from '@/lib/ai-service';

// These functions now use the configured AI provider automatically
const suggestions = await checkGrammar(token, sectionTitle, content, language);
const prompts = await getGuidedPrompts(token, sectionKey, sectionTitle, language);
const summary = await getSummary(token, sectionTitle, content, language);
```

## Provider Interface

All AI providers must implement the `AIProvider` interface:

```typescript
interface AIProvider {
  improveGrammar(text: string, language: string): Promise<string>;

  suggestImprovements(
    text: string,
    section: string,
    language: string
  ): Promise<Improvement[]>;

  rewriteSection(
    text: string,
    tone: string,
    language: string
  ): Promise<string>;

  generateSummary(text: string, language: string): Promise<string>;

  suggestTitles(
    biographyContent: string,
    count: number,
    language: string
  ): Promise<string[]>;

  checkGrammar(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<Array<{
    id: string;
    original: string;
    suggestion: string;
    explanation: string;
  }>>;

  getGuidedPrompts(
    token: string,
    sectionKey: string,
    sectionTitle: string,
    language: string
  ): Promise<Array<{ prompt: string; starter: string }>>;

  getSummary(
    token: string,
    sectionTitle: string,
    content: string,
    language: string
  ): Promise<string>;
}
```

## Improvement Types

The `suggestImprovements` method returns improvements categorized by type:

- **clarity**: Makes confusing text clearer
- **detail**: Adds missing details or specificity
- **flow**: Improves transitions and narrative flow
- **style**: Enhances writing style and tone
- **structure**: Reorganizes content structure

Each improvement has a priority:
- **high**: Critical errors or important changes
- **medium**: Beneficial improvements
- **low**: Optional suggestions

## Adding a New Provider

To add a new AI provider:

1. Create a new class implementing the `AIProvider` interface
2. Add the provider to the factory function in `ai-provider.ts`
3. Update the environment variable documentation
4. Test all interface methods

Example:

```typescript
class NewProvider implements AIProvider {
  async improveGrammar(text: string, language: string): Promise<string> {
    // Implementation
  }

  // ... implement other methods
}

// Update factory function
export function getAIProvider(): AIProvider {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'claude';

  switch (provider.toLowerCase()) {
    case 'euria':
      return new EuriaProvider();
    case 'newprovider':
      return new NewProvider();
    case 'claude':
    default:
      return new ClaudeProvider();
  }
}
```

## Current Implementation Status

### Claude Provider
- ✅ checkGrammar
- ✅ getGuidedPrompts
- ✅ getSummary
- ✅ suggestImprovements
- ⏳ improveGrammar (partial)
- ⏳ rewriteSection (not implemented)
- ⏳ suggestTitles (not implemented)

### Euria Provider
- ⏳ All methods (placeholder - coming soon)

## Migration Guide

To migrate existing code to use the abstraction:

1. Import from the abstraction layer:
```typescript
// Old
import { checkGrammar } from '@/lib/ai-service';

// New (for new features)
import { aiService } from '@/lib/ai/ai-provider';
```

2. Update function calls:
```typescript
// Old
const result = await checkGrammar(token, title, content, lang);

// New
const result = await aiService.checkGrammar(token, title, content, lang);
```

3. Existing code using `ai-service.ts` will continue to work without changes.

## Testing

To test with different providers:

1. Set `NEXT_PUBLIC_AI_PROVIDER=claude` in `.env`
2. Test all AI features
3. Switch to `NEXT_PUBLIC_AI_PROVIDER=euria` (when implemented)
4. Verify all features work identically

## Benefits

- **Flexibility**: Switch AI providers without code changes
- **Vendor Independence**: Not locked into a single AI service
- **Cost Optimization**: Choose providers based on cost/performance
- **Fallback Support**: Use multiple providers with fallback logic
- **Testing**: Easy to mock for testing
