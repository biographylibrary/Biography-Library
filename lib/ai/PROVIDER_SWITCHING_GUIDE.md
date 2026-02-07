# AI Provider Switching Guide

This guide explains how to switch between Claude (Anthropic) and Euria (Infomaniak) AI providers.

## Current Architecture

The application uses a **centralized edge function** architecture where:

1. **Frontend** → Makes requests to edge function
2. **Edge Function** → Routes to Claude or Euria based on `AI_PROVIDER` environment variable
3. **AI API** → Returns response through edge function back to frontend

This means **switching providers requires NO code changes** - only environment variable updates.

## Quick Switch Guide

### Switch to Euria

1. Add Euria credentials to Supabase Edge Function secrets:
   ```bash
   EURIA_API_KEY=your_euria_api_key
   EURIA_API_URL=https://api.infomaniak.com/1/ai/chat
   ```

2. Update provider selection:
   ```bash
   AI_PROVIDER=euria
   ```

3. Done! The app now uses Euria.

### Switch to Claude

1. Ensure Claude credentials exist in Supabase Edge Function secrets:
   ```bash
   ANTHROPIC_API_KEY=your_claude_api_key
   ```

2. Update provider selection:
   ```bash
   AI_PROVIDER=claude
   ```

3. Done! The app now uses Claude.

## Testing Both Providers

You can verify which provider is active by checking the edge function logs:

```bash
# Claude logs will show:
"Claude API error" or "Anthropic API error"

# Euria logs will show:
"Euria API error"
```

## Frontend Provider Class (Optional)

The `NEXT_PUBLIC_AI_PROVIDER` environment variable is optional and controls which provider class is instantiated on the frontend:

- `ClaudeProvider` - Calls edge function
- `EuriaProvider` - Calls edge function

**Both classes call the same edge function**, so this variable doesn't affect which AI API is actually used. It's mainly for future extensibility (e.g., if you want different client-side behavior).

## API Key Security

✅ **Secure**: API keys are stored in Supabase Edge Function secrets (server-side)
❌ **Never**: Put API keys in `.env` file or frontend code

## Troubleshooting

### "AI service is not configured"

This means the required API key for your selected provider is missing:

- For `AI_PROVIDER=claude`: Add `ANTHROPIC_API_KEY`
- For `AI_PROVIDER=euria`: Add `EURIA_API_KEY`

### "Invalid API key"

The API key is present but incorrect. Double-check:

- No extra spaces or quotes
- Key is valid and not expired
- Key has the correct permissions

### Edge function not routing correctly

Check the edge function logs to see which provider it's trying to use:

```bash
# Check AI_PROVIDER value in edge function
console.log("Using provider:", aiProvider);
```

## Provider-Specific Differences

### Response Format

Both providers return similar formats, but there are minor differences:

**Claude**:
```json
{
  "content": [
    {
      "text": "response text"
    }
  ]
}
```

**Euria**:
```json
{
  "choices": [
    {
      "message": {
        "content": "response text"
      }
    }
  ]
}
```

The edge function handles these differences automatically.

### Model Selection

**Claude**: Uses `claude-sonnet-4-20250514` (configurable in edge function)

**Euria**: Uses `euria-chat` (configurable in edge function)

### Rate Limits

Rate limiting is handled by the edge function's `ai_rate_limits` table:
- 5 requests per minute per user
- Applied before calling any AI provider

## Future Enhancements

Potential improvements:

1. **Fallback Logic**: If primary provider fails, automatically try secondary provider
2. **Cost Optimization**: Route different actions to different providers based on cost
3. **A/B Testing**: Randomly assign users to different providers to compare quality
4. **Provider Metrics**: Track response time, error rate, and cost per provider

## Support

For issues with:
- **Claude**: Check Anthropic API status at https://status.anthropic.com
- **Euria**: Check Infomaniak API status at https://www.infomaniak.com/en/support

For application issues, check edge function logs in Supabase dashboard.
