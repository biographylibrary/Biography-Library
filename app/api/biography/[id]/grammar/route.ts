import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/onboarding-api-auth';
import { buildServiceClient } from '@/lib/server/service-client';
import { resolveBiographyId } from '@/lib/server/biography-view-access';
import { isPlatformStaffRole } from '@/lib/server/staff-roles';
import type { UserRole } from '@/lib/auth-context';
import { chat } from '@/lib/agents/infomaniak-client';
import {
  GRAMMAR_MAX_CHARS,
  GRAMMAR_MAX_RAW_CHARS,
  GRAMMAR_MODEL_PARAMS,
  buildGrammarPrompt,
  extractJson,
  grammarLanguageForTag,
  grammarModelChain,
  grammarTooLongMessage,
  sanitizeGrammarSuggestions,
  stripHtmlToPlain,
  type GrammarSuggestion,
} from '@/lib/ai/grammar';
import {
  GRAMMAR_DAILY_LIMIT,
  GRAMMAR_WEEKLY_LIMIT,
  checkAndIncrementUsage,
  isOverMinuteLimit,
  recordMinuteHit,
} from '@/lib/ai/grammar-limits';
import { checkAuthorTokenCap, tokenCapResponseBody } from '@/lib/ai/token-caps';
import { isEditionBiography } from '@/lib/edition-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Controllo grammaticale su richiesta (spostato dall'Edge Function ai-assistant).
 *
 * Accesso con le stesse regole delle policy RLS di UPDATE su `biographies`:
 * il proprietario con account attivo e biografia non congelata, oppure lo staff.
 * Il testo arriva nel corpo perché l'autore corregge anche testo non ancora salvato.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthenticatedUser(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user.id;

  let body: {
    content?: unknown;
    sectionTitle?: unknown;
    language?: unknown;
    uiLanguage?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const service = buildServiceClient();
  const biographyId = await resolveBiographyId(service, params.id);
  if (!biographyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [{ data: profile }, { data: bio }] = await Promise.all([
    service.from('profiles').select('role, account_status').eq('id', userId).maybeSingle(),
    service
      .from('biographies')
      .select('user_id, is_frozen, translation_of')
      .eq('id', biographyId)
      .maybeSingle(),
  ]);
  if (!bio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const role = (profile as { role?: string } | null)?.role as UserRole | undefined;
  const isStaff = isPlatformStaffRole(role);
  const accountActive = (profile as { account_status?: string } | null)?.account_status === 'active';
  const bioRow = bio as {
    user_id: string;
    is_frozen: boolean;
    translation_of?: string | null;
  };

  if (!isStaff) {
    if (bioRow.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!accountActive) {
      return NextResponse.json({ error: 'account_not_active' }, { status: 403 });
    }
    if (bioRow.is_frozen) {
      return NextResponse.json({ error: 'biography_frozen' }, { status: 403 });
    }
  }

  if (isEditionBiography(bioRow.translation_of)) {
    return NextResponse.json(
      { error: 'grammar_not_available_for_edition' },
      { status: 403 }
    );
  }

  const languageRaw = typeof body.language === 'string' ? body.language : null;
  const language =
    languageRaw === null ? 'en' : grammarLanguageForTag(languageRaw);
  if (language === null) {
    return NextResponse.json({ error: 'language_not_supported' }, { status: 422 });
  }
  const uiLanguage = typeof body.uiLanguage === 'string' ? body.uiLanguage : language;
  const sectionTitle = typeof body.sectionTitle === 'string' ? body.sectionTitle.trim() : '';
  const rawContent = typeof body.content === 'string' ? body.content : '';

  if (!rawContent || !sectionTitle) {
    return NextResponse.json(
      { error: 'Missing content or sectionTitle for grammar check' },
      { status: 400 }
    );
  }

  const tooLong = () =>
    NextResponse.json(
      {
        error: 'text_too_long',
        message: grammarTooLongMessage(uiLanguage),
        maxChars: GRAMMAR_MAX_CHARS,
      },
      { status: 413 }
    );
  if (rawContent.length > GRAMMAR_MAX_RAW_CHARS) return tooLong();
  const plainContent = stripHtmlToPlain(rawContent);
  if (plainContent.length > GRAMMAR_MAX_CHARS) return tooLong();
  if (!plainContent) {
    return NextResponse.json(
      { error: 'Missing content or sectionTitle for grammar check' },
      { status: 400 }
    );
  }

  if (!isStaff) {
    if (await isOverMinuteLimit(service, userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const cap = await checkAuthorTokenCap(service, userId, { isStaff });
    if (!cap.allowed) {
      return NextResponse.json(tokenCapResponseBody(cap, uiLanguage), { status: 429 });
    }

    const usage = await checkAndIncrementUsage(service, userId, 1);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error:
            usage.limitType === 'daily'
              ? `Daily limit reached. Resets at ${usage.resetAt}`
              : `Weekly limit reached. Resets at ${usage.resetAt}`,
          limitType: usage.limitType,
          resetAt: usage.resetAt,
          dailyLimit: GRAMMAR_DAILY_LIMIT,
          weeklyLimit: GRAMMAR_WEEKLY_LIMIT,
        },
        { status: 429 }
      );
    }
  }

  await recordMinuteHit(service, userId, 'grammar');

  const prompt = buildGrammarPrompt(sectionTitle, plainContent, language);
  let textContent: string;
  let modelUsed: string;
  try {
    const result = await chat({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      models: grammarModelChain(),
      max_tokens: GRAMMAR_MODEL_PARAMS.max_tokens,
      temperature: GRAMMAR_MODEL_PARAMS.temperature,
      timeoutMs: GRAMMAR_MODEL_PARAMS.timeoutMs,
      retry: GRAMMAR_MODEL_PARAMS.retry,
      stopOnClientError: true,
      usage: { purpose: 'grammar', userId, biographyId },
    });
    textContent = result.content;
    modelUsed = result.modelUsed;
  } catch (err) {
    console.error('[api/biography/grammar] AI error:', err);
    const message =
      err instanceof Error && err.message.includes('INFOMANIAK_AI_TOKEN')
        ? 'AI service is not configured yet.'
        : 'AI service error. Please try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const data = JSON.parse(extractJson(textContent));
    const out = Array.isArray(data)
      ? sanitizeGrammarSuggestions(data as GrammarSuggestion[])
      : data;
    return NextResponse.json({ action: 'grammar', data: out, model_used: modelUsed });
  } catch {
    return NextResponse.json(
      { error: 'AI returned an invalid response. Please try again.' },
      { status: 502 }
    );
  }
}
