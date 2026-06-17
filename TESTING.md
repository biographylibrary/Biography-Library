# AI Features Testing Guide

This document provides comprehensive instructions for testing all AI features powered by Infomaniak Mistral3.

## Prerequisites

Before testing AI features, ensure:

1. **Supabase Configuration**
   - Project is configured with valid Supabase URL and keys in `.env.local` (copy from `.env.example`)
   - Database migrations have been applied
   - User authentication is working

2. **Infomaniak AI Configuration**
   - `INFOMANIAK_AI_TOKEN` is set in Supabase Dashboard:
     - Go to: Project Settings > Edge Functions > Manage secrets
     - Add secret: `INFOMANIAK_AI_TOKEN` with your Infomaniak API token
   - Edge function `ai-assistant` is deployed and accessible

3. **Test Account**
   - Create a test user account
   - Create at least one biography for testing

## Feature Testing Checklist

### 1. Grammar Check ✓

**Purpose**: AI reviews text for grammar, spelling, clarity, and style errors.

**Test Steps**:
1. Navigate to biography editor (any section)
2. Write text with intentional errors:
   ```
   I goed to the store yesterday. She dont like apples.
   Me and my friend was very happy.
   ```
3. Click the **"Check Grammar"** button in the toolbar
4. Verify loading state appears
5. Verify suggestions panel shows corrections:
   - "goed" → "went"
   - "dont" → "doesn't"
   - "Me and my friend was" → "My friend and I were"
6. Each suggestion should include explanation

**Multi-Language Test**:
- Test in English (en): Write "I goed to school"
- Test in Italian (it): Write "Io andato a scuola" (should be "sono andato")
- Test in French (fr): Write "Je suis allé au école" (should be "à l'école")
- Test in German (de): Write "Ich bin gegangen zur Schule" (should be "in die Schule")

**Expected Behavior**:
- Suggestions appear in a panel
- Each suggestion shows original text, correction, and explanation
- Explanations are in the same language as content
- User can apply individual suggestions or dismiss them

**Error Cases**:
- Empty content: Should show error message
- Very long content (>5000 words): Should handle gracefully
- Network error: Should show user-friendly error message

---

### 2. Guided Conversation Mode ✓

**Purpose**: AI asks ice-breaker questions to help users write their biography through conversation.

**Test Steps**:
1. Navigate to any biography section
2. Click **"Start Guided Conversation"** button
3. Verify AI generates 5 ice-breaker questions
4. Answer the first question with brief text (< 20 words):
   ```
   "I grew up in Rome."
   ```
5. Verify AI asks a follow-up question for more detail:
   ```
   "What was Rome like when you were growing up?"
   ```
6. Answer follow-up with detailed response (> 80 words)
7. Verify AI acknowledges and moves to next question
8. Test "skip" functionality by answering with:
   ```
   "I prefer not to say"
   ```
9. Verify AI acknowledges and skips gracefully

**Multi-Language Test**:
- Switch biography language to Italian
- Start guided conversation
- Verify questions are in Italian
- Verify follow-up questions are in Italian
- Verify acknowledgments are in Italian

**Checkpoint Test**:
1. Answer 2-3 questions in conversation mode
2. Close the editor or refresh page
3. Return to same section
4. Click "Resume Conversation"
5. Verify previous Q&A pairs are restored
6. Verify conversation continues from where you left off

**Expected Behavior**:
- Ice-breaker questions are thoughtful and specific to section
- AI asks follow-ups for brief answers (< 30 words)
- AI doesn't ask follow-ups after detailed answers (> 80 words)
- AI respects skip phrases and moves on
- Conversation checkpoints save automatically
- User can generate draft from conversation at any time

---

### 3. Section Review & AI Improvements ✓

**Purpose**: AI reviews completed sections and suggests improvements.

**Test Steps**:
1. Write a complete section (minimum 200 words) with room for improvement:
   ```
   I was born in a small town. It was nice. I went to school there.
   My family was good. We had a house. I liked it.
   ```
2. Mark section as **"Draft 1"** using status bar
3. Click **"Review with AI"** button in section toolbar
4. Verify loading state appears
5. Verify improvements panel shows categorized suggestions:
   - **Clarity**: Suggestions to make text clearer
   - **Detail**: Suggestions to add more specific information
   - **Flow**: Suggestions to improve transitions
   - **Style**: Suggestions to enhance writing style
   - **Structure**: Suggestions to improve organization
6. Click on individual improvement to apply it
7. Verify text updates in editor
8. Test **"Rewrite Section"** with different tones:
   - Select "Narrative" tone → verify storytelling style
   - Select "Formal" tone → verify professional style
   - Select "Intimate" tone → verify personal, warm style

**Multi-Language Test**:
- Test in Italian with simple text
- Click "Review with AI"
- Verify suggestions are in Italian
- Verify rewrite preserves all facts but improves style

**Expected Behavior**:
- Improvements are categorized by type
- Each improvement has priority (high/medium/low)
- User can apply individual improvements
- Full rewrites preserve all factual information
- Revision history saves previous versions
- Statistics show word count and readability score

---

### 4. Content Summarization ✓

**Purpose**: AI generates concise summaries of section content.

**Test Steps**:
1. Write substantial content (minimum 300 words) in a section
2. Click **"Summarize"** button in section toolbar
3. Verify loading state appears
4. Verify AI returns 2-3 sentence summary
5. Verify summary captures key themes and events

**Multi-Language Test**:
- Write section in French
- Click "Summarize"
- Verify summary is in French
- Verify summary accurately reflects content

**Expected Behavior**:
- Summary is concise (2-3 sentences)
- Summary captures main points
- Summary language matches content language
- Summary is displayed in appropriate UI location

---

### 5. Smart Section Recommendation ✓

**Purpose**: AI suggests which section to write next based on content already written.

**Test Steps**:
1. Complete "Childhood" section with substantial content mentioning school
2. Mark section as complete
3. Trigger next section recommendation
4. Verify AI suggests logical next section (likely "Education")
5. Verify recommendation includes personalized reason
6. Complete the suggested section
7. Get recommendation again
8. Verify chronological flow is respected

**Expected Behavior**:
- Recommendations consider what was mentioned in content
- Recommendations follow natural chronological order
- Recommendations are personalized and encouraging
- Completed sections are excluded from suggestions
- If all sections complete, suggests reviewing "Legacy"

---

### 6. Title Generation ✓

**Purpose**: AI suggests engaging titles for completed biographies.

**Test Steps**:
1. Complete multiple sections of a biography
2. Navigate to publish/export workflow
3. Click **"Suggest Titles"** button
4. Verify AI generates 3-5 title options
5. Verify titles are based on biography content
6. Verify titles are in correct language

**Multi-Language Test**:
- Complete biography in German
- Request title suggestions
- Verify all titles are in German
- Verify titles reflect biography themes

**Expected Behavior**:
- Generates 3-5 diverse title options
- Titles reflect biography content and themes
- Titles are appropriate length (5-15 words)
- Titles match biography language

---

## Error Handling Tests

### Missing Token Configuration

**Test Steps**:
1. Remove `INFOMANIAK_AI_TOKEN` from Supabase Edge Function secrets
2. Attempt to use any AI feature
3. Verify user-friendly error message appears:
   ```
   "AI service is not configured yet. Please contact support."
   ```
4. Verify error is logged for debugging
5. Restore token
6. Verify features work again

### Invalid Token

**Test Steps**:
1. Set `INFOMANIAK_AI_TOKEN` to invalid value
2. Attempt to use AI feature
3. Verify appropriate error message:
   ```
   "Invalid API key. Please check configuration."
   ```
4. Restore valid token

### Rate Limiting

**Test Steps**:
1. Make 6+ AI requests quickly (within 60 seconds)
2. Verify 6th request shows rate limit error:
   ```
   "Rate limit exceeded. Please wait a moment before trying again."
   ```
3. Wait 60 seconds
4. Verify AI features work again

### Network Errors

**Test Steps**:
1. Simulate network error (disconnect internet briefly)
2. Attempt AI feature
3. Verify graceful error handling
4. Verify user can retry after reconnecting

---

## UI/UX Verification

### Loading States

**Verify for all AI features**:
- Spinner/loading indicator appears during AI processing
- UI is disabled during processing
- Loading message is clear and translated
- User cannot trigger multiple requests simultaneously

### Success States

**Verify for all AI features**:
- Success toast/notification appears
- Results are displayed clearly
- User can interact with results immediately
- Results are saved/persisted as appropriate

### Error States

**Verify for all AI features**:
- Error messages are user-friendly (no technical jargon)
- Error messages are translated to user's language
- User has option to retry
- Error doesn't crash the application

---

## Performance Tests

### Response Time

**Expected Performance**:
- Grammar check: < 5 seconds for 500 words
- Conversation prompts: < 3 seconds
- Section review: < 8 seconds for 1000 words
- Summarization: < 4 seconds
- Recommendations: < 3 seconds

**Test Steps**:
1. Time each AI feature with typical content
2. Verify response times are reasonable
3. If slow, check Infomaniak API status
4. Verify loading states keep user informed

### Token Usage

**Test Steps**:
1. Use AI features throughout a session
2. Monitor rate limit counter
3. Verify rate limiting works correctly
4. Verify counter resets after 60 seconds

---

## Security Verification

### Token Handling

**Verify**:
- ✓ No AI token exposed in frontend code
- ✓ No AI token in browser network requests
- ✓ Token only stored in Supabase Edge Function secrets
- ✓ All AI requests go through edge function
- ✓ Edge function validates user authentication

### Authentication

**Verify**:
- ✓ Unauthenticated users cannot access AI features
- ✓ Users can only access AI for their own biographies
- ✓ JWT tokens are validated on every request
- ✓ Rate limiting is per-user (not global)

### Data Privacy

**Verify**:
- ✓ User content is sent to Infomaniak API only
- ✓ No content is logged or stored externally
- ✓ AI responses are private to user
- ✓ No sharing of user data between accounts

---

## Browser Compatibility

**Test in**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

**Verify**:
- AI features work in all browsers
- Loading states render correctly
- Error messages display properly
- No JavaScript console errors

---

## Final Production Checklist

Before deploying to production:

- [ ] All AI features tested and working
- [ ] Multi-language support verified for all 4 languages
- [ ] Error handling tested for all edge cases
- [ ] Rate limiting working correctly
- [ ] No debug console.logs in production code
- [ ] No hardcoded API keys or secrets
- [ ] .env.local not committed to git
- [ ] INFOMANIAK_AI_TOKEN configured in Supabase
- [ ] Edge function deployed and accessible
- [ ] Build succeeds without errors
- [ ] Performance acceptable for all features
- [ ] Security verification complete
- [ ] Browser compatibility verified

---

## Publication PDF flow

Manual smoke test for the PDF-first publication path (author account + optional admin).

### Prerequisites

- Biography in **`final_version`** with final text (≥ 50 chars) and at least one section with content
- Infomaniak AI env vars on Next server (`INFOMANIAK_AI_*`) for `draft-ai-review` and screening
- Migrations `20260508*` applied on target Supabase project

### Steps

| # | Action | Expected |
|---|--------|----------|
| 1 | Editor → Final review → **Start PDF phase** | `status` → `pdf_draft`; `pdf_draft_iteration` cleared |
| 2 | Upload **cover_a5** in photo gallery; toggle **author copyright page** in book structure | Rows persisted in `biography_media` / `biography_book_structure` |
| 3 | Advanced export → download **draft PDF** (round 1) | Watermark "DRAFT"; POST `/api/publication/draft-ai-review` returns `feedback` |
| 4 | Export dialog | Draft AI panel shows strengths/issues; severity 3 shows blocking banner |
| 5 | Repeat draft rounds 2–3 if needed | `pdf_draft_iteration` increments; max 3 |
| 6 | **Approve final PDF** | `locked_pending_screening` → screening → `published` or `under_review`; `final_pdf_url` + `listing_cover_url` set |
| 7 | Public listing + `/biography/[id]/view` | Cover from `listing_cover_url` or media fallback |

### API checks (curl / browser network)

- `POST /api/publication/draft-ai-review` without `Authorization` → **401**
- Wrong `biographyId` owner → **403**
- `status !== pdf_draft` → **400**

### Admin (optional)

- `/admin/users` → toggle reviewer language codes (EN/IT/FR/DE) for reviewer/admin
- `GET /api/admin/users` without Bearer → **401** (middleware)

---

## Troubleshooting

### "AI service is not configured yet"

**Solution**: Set `INFOMANIAK_AI_TOKEN` in Supabase Dashboard > Edge Functions > Manage secrets

### "Rate limit exceeded"

**Solution**: Wait 60 seconds before making another AI request

### "Invalid response format"

**Solution**: Check Infomaniak API status, verify model is "mistral3"

### AI responses in wrong language

**Solution**: Verify biography language is set correctly, check translation mappings

### Edge function timeout

**Solution**: Reduce content length, check Infomaniak API status, verify network connection

---

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Verify Infomaniak API status
3. Review browser console for errors
4. Check network requests for failed API calls
5. Verify all environment variables are set correctly
