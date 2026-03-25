import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RATE_LIMIT = parseInt(Deno.env.get('AI_RATE_LIMIT') ?? '5');
const RATE_WINDOW_MS = 60_000;

const DAILY_LIMIT = parseInt(Deno.env.get('AI_DAILY_LIMIT') ?? '40');
const WEEKLY_LIMIT = parseInt(Deno.env.get('AI_WEEKLY_LIMIT') ?? '200');

const HEAVY_ACTIONS = new Set(["rewrite", "analyze-themes", "propose-structures"]);

const PRIMARY_MODEL = Deno.env.get('INFOMANIAK_AI_MODEL_PRIMARY') ?? 'Apertus-70B-Instruct-2509';
const FALLBACK_MODEL = Deno.env.get('INFOMANIAK_AI_MODEL_FALLBACK') ?? 'mistral3';

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  de: "German",
};

const AI_CALL_TIMEOUT_MS = 30_000;

const JSON_ONLY_PREFIX = "You must respond with valid JSON only. Do not add any explanation, preamble, or text outside the JSON structure. Do not wrap the JSON in markdown code fences.\n\n";

function truncateToTokenBudget(text: string, maxChars = 14000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[Content truncated for analysis]';
}

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getNextMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.toISOString();
}

function getNextMondayUTC(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return nextMonday.toISOString();
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return text.trim();

  let start: number;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  const lastClose = text.lastIndexOf(closeChar);

  if (lastClose > start) {
    return text.slice(start, lastClose + 1).trim();
  }
  return text.trim();
}

function getLangName(lang: string): string {
  return LANGUAGE_NAMES[lang] || "English";
}

function buildGrammarPrompt(sectionTitle: string, content: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `${JSON_ONLY_PREFIX}You are a skilled editor helping with a biography written in ${langName}. Review text for grammar, spelling, clarity, and style in ${langName}. Preserve the author's voice and tone. Respond in ${langName}. Return a JSON array of suggestions. Each suggestion must have: "id" (unique string), "original" (the problematic text), "suggestion" (the corrected text), "explanation" (brief reason in ${langName}). If the text is already good, return an empty array.`,
    user: `Section: "${sectionTitle}"\n\nText to review:\n${content}`,
  };
}

function buildPromptsPrompt(sectionKey: string, sectionTitle: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `${JSON_ONLY_PREFIX}You are a warm, empathetic biography writing coach. Generate 5 thoughtful questions in ${langName} that help someone recall memories and stories for the given biography section. Questions should be specific, personal, and spark vivid memories. All text must be in ${langName}. Return a JSON array of objects with "prompt" (the question in ${langName}) and "starter" (a 5-8 word writing starter in ${langName} based on the question).`,
    user: `Generate prompts in ${langName} for the biography section: "${sectionTitle}" (key: ${sectionKey})`,
  };
}

function buildSummaryPrompt(sectionTitle: string, content: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `You are a biography editor. Write a concise 2-3 sentence summary in ${langName} of the following biography section content. The summary should capture the key themes and events. Respond entirely in ${langName}. Return plain text only, no JSON or markdown formatting.`,
    user: `Section: "${sectionTitle}"\n\nContent:\n${content}`,
  };
}

function buildAnalyzeAnswerPrompt(
  userAnswer: string,
  originalQuestion: string,
  conversationHistory: any[],
  language: string
) {
  const langName = getLangName(language);

  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = '\n\nRecent conversation context:\n' +
      conversationHistory.map((h: any) => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n');
  }

  return {
    system: `${JSON_ONLY_PREFIX}You are an empathetic biography interviewer. Analyze the user's answer to determine if it needs a follow-up question for more detail.

Guidelines:
- If the answer is very brief (< 30 words) or vague, ask ONE specific follow-up question
- If the answer mentions names, places, or events without context, ask for clarification
- If the answer is emotional or significant, ask a gentle follow-up like "How did that affect you?" or "What was that like for you?"
- If the answer is already detailed (> 80 words) and complete, no follow-up needed
- Follow-up questions must be warm, specific, and in ${langName}
- NEVER ask more than ONE follow-up per original question

Return a JSON object with:
{
  "needsFollowUp": boolean,
  "followUpQuestion": "specific question in ${langName}" (only if needsFollowUp is true),
  "acknowledgment": "brief warm response in ${langName} (1 sentence)"
}`,
    user: `Original question: "${originalQuestion}"

User's answer: "${userAnswer}"${historyContext}

Analyze this answer and determine if a follow-up question would help get more meaningful detail.`,
  };
}

function buildRecommendSectionPrompt(
  currentSection: string,
  completedSections: string[],
  sectionContent: string,
  availableSections: string[],
  language: string
) {
  const langName = getLangName(language);

  const sectionDescriptions: Record<string, string> = {
    'childhood': 'childhood memories, early years, family life growing up',
    'family': 'family background, parents, siblings, ancestors, family culture',
    'education': 'schooling, learning experiences, academic journey, teachers',
    'career': 'work life, professional achievements, career path, jobs',
    'life-events': 'major life events, turning points, important moments',
    'relationships': 'romantic relationships, marriage, love, partnerships',
    'challenges': 'difficulties faced, struggles, lessons learned, overcoming obstacles',
    'passions': 'hobbies, interests, passions, what brings joy',
    'legacy': 'values to pass on, life reflections, wisdom, final thoughts',
  };

  const availableSectionsWithDesc = availableSections
    .map(s => `- ${s}: ${sectionDescriptions[s] || s}`)
    .join('\n');

  return {
    system: `${JSON_ONLY_PREFIX}You are a biography writing coach helping someone write their life story in ${langName}. The user just completed a section. Based on the content they wrote, recommend which section they should work on next.

Consider:
1. Natural chronological flow (childhood -> education -> career -> relationships -> legacy)
2. Topics they mentioned but didn't fully explore
3. Emotional readiness (avoid suggesting heavy topics too early)
4. Building narrative momentum

Available sections to recommend from:
${availableSectionsWithDesc}

Already completed: ${completedSections.join(', ') || 'none'}

Return a JSON object with:
{
  "recommendedSection": "section-key" (must be one of the available sections),
  "reason": "brief explanation in ${langName} (1-2 sentences, personal and encouraging)",
  "confidence": "high" | "medium" | "low"
}`,
    user: `User just completed section: "${currentSection}"

Content excerpt from this section:
"${sectionContent}"

What section should they work on next?`,
  };
}

function buildRewritePrompt(
  sectionTitle: string,
  content: string,
  tone: string,
  language: string
) {
  const langName = getLangName(language);

  const toneInstructions: Record<string, string> = {
    narrative: `Write in a flowing, storytelling style. Use vivid descriptions, sensory details, and narrative techniques. Make it engaging and immersive, as if telling a story to a friend.`,
    formal: `Write in a formal, polished style. Use proper grammar, sophisticated vocabulary, and clear structure. Suitable for official documents or professional publications.`,
    intimate: `Write in a warm, personal, conversational style. Use first-person perspective, emotional honesty, and direct address. Make it feel like a heartfelt letter to loved ones.`,
  };

  const instruction = toneInstructions[tone] || toneInstructions['narrative'];

  return {
    system: `You are a skilled biography editor. Rewrite the following biography section in ${langName} with a ${tone} tone.

${instruction}

Important:
- Preserve all factual information and key details
- Maintain the original meaning and events
- Keep the same chronological order
- Write entirely in ${langName}
- Return ONLY the rewritten text, no additional commentary or markdown formatting`,
    user: `Section: "${sectionTitle}"

Original text:
${content}

Rewrite this in a ${tone} tone while preserving all facts and details.`,
  };
}

function buildAnalyzeThemesPrompt(sections: any[], language: string) {
  const sectionsText = sections.map(s => `
Section Key: ${s.key}
Section Title: ${s.title}
Content: ${s.content.substring(0, 500)}...
`).join('\n---\n');

  return {
    system: `${JSON_ONLY_PREFIX}You are a biography editor analyzing narrative themes. For each section, identify the main themes and provide a brief summary. Themes can include: career, relationships, travel, personal growth, challenges, family, education, hobbies, life lessons.`,
    user: `Analyze the following biography sections and identify the main themes in each section.

For each section, identify:
1. Main themes (career, relationships, travel, personal growth, challenges, family, education, hobbies, life lessons)
2. The primary theme (the most dominant theme)
3. A brief content summary

Sections:
${sectionsText}

IMPORTANT: Use the exact "Section Key" value provided for each section in the "sectionKey" field of your response.

Respond in JSON format:
{
  "analysis": [
    {
      "sectionKey": "childhood",
      "sectionTitle": "Childhood",
      "themes": ["family", "education"],
      "mainTheme": "family",
      "contentSummary": "brief summary of the section content"
    }
  ]
}`,
  };
}

function buildProposeStructuresPrompt(
  themeAnalysis: any[],
  originalOrder: string[],
  language: string
) {
  return {
    system: `${JSON_ONLY_PREFIX}You are a biography editor proposing alternative narrative structures. Based on theme analysis, suggest 3 different ways to reorder sections for better storytelling.`,
    user: `Based on this theme analysis of biography sections, propose 3 alternative narrative structures.

Theme Analysis:
${JSON.stringify(themeAnalysis, null, 2)}

Original Order: ${originalOrder.join(' -> ')}

IMPORTANT RULES:
- DO NOT change any content or words
- ONLY reorder sections to create better narrative flow
- Each proposal should focus on different storytelling approach
- Provide clear rationale for each structure
- Explain how transitions work between reordered sections

Proposal types to consider:
1. Thematic grouping (group by theme like career, relationships, personal growth)
2. Emotional arc (arrange by emotional journey)
3. Impact-based (start with most impactful moments)

Respond in JSON format:
{
  "proposals": [
    {
      "structureType": "descriptive name",
      "sectionOrder": ["key1", "key2"],
      "rationale": "why this order works",
      "transitionNotes": ["how section1 leads to section2"],
      "focusTheme": "main theme of this structure"
    }
  ]
}`,
  };
}

function buildPrePublicationCheckPrompt(biographyText: string) {
  return {
    system: `${JSON_ONLY_PREFIX}You are a content moderator for Biography Library, a platform for personal autobiographies and memoirs of deceased persons. Analyze the text for violations:
Level 1 (automatic block): genocide glorification, CSAM, terrorism, direct violence incitement, human trafficking, WMD instructions, suicide promotion.
Level 2 (review required): hate speech targeting race/religion/gender/sexuality/disability, targeted harassment, graphic violence without narrative context, copyright.
Level 3 (publish with warning): controversial opinions, contested historical narratives.`,
    user: `Analyze the following biography text for content violations and return a JSON object with this exact structure:
{
  "passed": boolean,
  "violation_level": 1 | 2 | 3 | null,
  "flagged_passages": [
    { "text": "...", "reason": "...", "level": 1 | 2 | 3 }
  ],
  "summary": "short explanation for reviewers"
}

If no violations are found, return passed: true, violation_level: null, flagged_passages: [], and a brief positive summary.
The violation_level should be the highest level found among all flagged passages (null if none).

Biography text:
${biographyText}`,
  };
}

function buildDetectSectionPrompt(chunkText: string, language: string) {
  const langName = getLangName(language);

  const sectionHints: Record<string, string> = {
    childhood: 'early memories, youth, first experiences',
    family: 'parents, siblings, relatives, ancestry',
    education: 'school, university, learning, studies',
    career: 'work, jobs, professional life, career milestones',
    'life-events': 'important moments, major events, turning points',
    relationships: 'spouse, partners, friendships, romantic life',
    challenges: 'difficulties, hardships, obstacles, lessons learned',
    passions: 'hobbies, interests, leisure activities',
    legacy: 'impact, what to be remembered for, final thoughts',
  };

  const detailedSections = Object.entries(sectionHints)
    .map(([key, hint]) => `- ${key}: ${hint}`)
    .join('\n');

  return {
    system: `${JSON_ONLY_PREFIX}You are analyzing a biography excerpt to determine which section it belongs to.

Available sections:
${detailedSections}

Analyze the text and determine which biography section it most likely belongs to. Consider the main theme, time period, and subject matter.

Return a JSON object:
{"section": "section_key", "confidence": "high|medium|low", "reason": "Brief explanation in ${langName}"}`,
    user: `Text excerpt:\n"""\n${chunkText}\n"""`,
  };
}

async function callWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fn();
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error('All retries failed');
}

async function callAIWithFallback(
  payload: object,
  endpoint: string,
  token: string
): Promise<{ data: unknown; modelUsed: string }> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const res = await callWithRetry(() =>
        fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, model }),
          signal: AbortSignal.timeout(28000),
        })
      );

      if (res.ok) {
        const data = await res.json();
        return { data, modelUsed: model };
      }

      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const errText = await res.text();
        console.error("Infomaniak AI error:", { status: res.status, body: errText });
        if (res.status === 401) {
          throw new Error("Invalid API key. Please check your INFOMANIAK_AI_TOKEN.");
        }
        throw new Error(`AI error: ${res.status}`);
      }

      console.warn(
        `Model ${model} failed (${res.status}), ${i < models.length - 1 ? "trying fallback" : "no more fallbacks"}`
      );
    } catch (err) {
      if (i === models.length - 1) throw err;
      console.warn(`Model ${model} threw error, trying fallback: ${err}`);
    }
  }
  throw new Error("All AI models failed");
}

async function checkAndIncrementUsage(
  supabase: any,
  userId: string,
  cost: number
): Promise<{ allowed: boolean; limitType?: "daily" | "weekly"; resetAt?: string }> {
  const nowUtc = new Date();
  const todayStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
  const weekDay = nowUtc.getUTCDay();
  const daysToMonday = weekDay === 0 ? -6 : 1 - weekDay;
  const weekStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() + daysToMonday));

  const { data: existing, error: fetchError } = await supabase
    .from("ai_usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Usage fetch error:", fetchError);
    return { allowed: true };
  }

  let dailyCount = 0;
  let weeklyCount = 0;
  let dailyResetAt = todayStart;
  let weeklyResetAt = weekStart;

  if (existing) {
    dailyCount = existing.daily_count;
    weeklyCount = existing.weekly_count;
    dailyResetAt = new Date(existing.daily_reset_at);
    weeklyResetAt = new Date(existing.weekly_reset_at);

    if (dailyResetAt < todayStart) {
      dailyCount = 0;
      dailyResetAt = todayStart;
    }
    if (weeklyResetAt < weekStart) {
      weeklyCount = 0;
      weeklyResetAt = weekStart;
    }
  }

  if (dailyCount + cost > DAILY_LIMIT) {
    return { allowed: false, limitType: "daily", resetAt: getNextMidnightUTC() };
  }

  if (weeklyCount + cost > WEEKLY_LIMIT) {
    return { allowed: false, limitType: "weekly", resetAt: getNextMondayUTC() };
  }

  const newDaily = dailyCount + cost;
  const newWeekly = weeklyCount + cost;

  if (existing) {
    await supabase
      .from("ai_usage_tracking")
      .update({
        daily_count: newDaily,
        weekly_count: newWeekly,
        daily_reset_at: dailyResetAt.toISOString(),
        weekly_reset_at: weeklyResetAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("ai_usage_tracking")
      .insert({
        user_id: userId,
        daily_count: newDaily,
        weekly_count: newWeekly,
        daily_reset_at: todayStart.toISOString(),
        weekly_reset_at: weekStart.toISOString(),
      });
  }

  return { allowed: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const infomaniakToken = Deno.env.get("INFOMANIAK_AI_TOKEN") || "";
    const infomaniakEndpoint = Deno.env.get("INFOMANIAK_AI_ENDPOINT") || "";

    if (!infomaniakToken) {
      return errorResponse(
        "Infomaniak AI is not configured. Please set INFOMANIAK_AI_TOKEN in Supabase Dashboard > Project Settings > Edge Functions > Manage secrets.",
        503
      );
    }

    if (!infomaniakEndpoint) {
      throw new Error("INFOMANIAK_AI_ENDPOINT not configured");
    }

    const authHeader = req.headers.get("Authorization");
    console.log("[AI-EDGE] Authorization header present:", !!authHeader);
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[AI-EDGE] Token prefix (first 20 chars):", token.slice(0, 20));

    const supabaseUrlPresent = !!Deno.env.get("SUPABASE_URL");
    const serviceRoleKeyPresent = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("[AI-EDGE] Env vars present - SUPABASE_URL:", supabaseUrlPresent, "SERVICE_ROLE_KEY:", serviceRoleKeyPresent);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log("[AI-EDGE] getUser result - user present:", !!user, "error:", authError?.message ?? "none", "error status:", authError?.status ?? "none");

    if (authError || !user) {
      console.error("Auth error:", authError?.message, "status:", authError?.status);
      const isExpiry =
        authError?.message?.toLowerCase().includes("expired") ||
        authError?.message?.toLowerCase().includes("token is expired") ||
        authError?.status === 401;
      if (isExpiry && authError) {
        return errorResponse("TOKEN_EXPIRED", 401);
      }
      return errorResponse("Unauthorized", 401);
    }

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("ai_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if (count !== null && count >= RATE_LIMIT) {
      return errorResponse(
        "Rate limit exceeded. Please wait a moment before trying again.",
        429
      );
    }

    const body = await req.json();
    const {
      action,
      sectionTitle,
      sectionKey,
      content,
      language = "en",
      userAnswer,
      originalQuestion,
      conversationHistory,
      currentSection,
      completedSections,
      sectionContent,
      availableSections,
      sections,
      themeAnalysis,
      originalOrder,
      chunkText
    } = body;

    if (!action) {
      return errorResponse("Missing action parameter", 400);
    }

    const actionCost = HEAVY_ACTIONS.has(action) ? 2 : 1;

    const usageCheck = await checkAndIncrementUsage(supabase, user.id, actionCost);
    if (!usageCheck.allowed) {
      return errorResponse(
        usageCheck.limitType === "daily"
          ? `Daily limit reached. Resets at ${usageCheck.resetAt}`
          : `Weekly limit reached. Resets at ${usageCheck.resetAt}`,
        429,
        {
          limitType: usageCheck.limitType,
          resetAt: usageCheck.resetAt,
          dailyLimit: DAILY_LIMIT,
          weeklyLimit: WEEKLY_LIMIT,
        }
      );
    }

    let systemPrompt: string;
    let userPrompt: string;
    let maxTokens = 1024;

    switch (action) {
      case "grammar": {
        if (!content || !sectionTitle) {
          return errorResponse(
            "Missing content or sectionTitle for grammar check",
            400
          );
        }
        const p = buildGrammarPrompt(sectionTitle, content, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 2048;
        break;
      }
      case "prompts": {
        if (!sectionKey || !sectionTitle) {
          return errorResponse(
            "Missing sectionKey or sectionTitle for prompts",
            400
          );
        }
        const p = buildPromptsPrompt(sectionKey, sectionTitle, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        break;
      }
      case "summary": {
        if (!content || !sectionTitle) {
          return errorResponse(
            "Missing content or sectionTitle for summary",
            400
          );
        }
        const p = buildSummaryPrompt(sectionTitle, content, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 512;
        break;
      }
      case "analyze-answer": {
        if (!userAnswer || !originalQuestion) {
          return errorResponse(
            "Missing userAnswer or originalQuestion for analysis",
            400
          );
        }
        const p = buildAnalyzeAnswerPrompt(
          userAnswer,
          originalQuestion,
          conversationHistory || [],
          language
        );
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 512;
        break;
      }
      case "recommend-next-section": {
        if (!currentSection || !sectionContent || !availableSections) {
          return errorResponse(
            "Missing currentSection, sectionContent, or availableSections for recommendation",
            400
          );
        }
        const p = buildRecommendSectionPrompt(
          currentSection,
          completedSections || [],
          sectionContent,
          availableSections,
          language
        );
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 512;
        break;
      }
      case "rewrite": {
        if (!content || !sectionTitle) {
          return errorResponse(
            "Missing content or sectionTitle for rewrite",
            400
          );
        }
        const tone = body.tone || 'narrative';
        const p = buildRewritePrompt(sectionTitle, truncateToTokenBudget(content), tone, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 4096;
        break;
      }
      case "analyze-themes": {
        if (!sections || !Array.isArray(sections)) {
          return errorResponse(
            "Missing sections array for theme analysis",
            400
          );
        }
        const truncatedSections = sections.map((s: any) => ({
          ...s,
          content: truncateToTokenBudget(s.content ?? '', 2000),
        }));
        const p = buildAnalyzeThemesPrompt(truncatedSections, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 2000;
        break;
      }
      case "propose-structures": {
        if (!themeAnalysis || !originalOrder) {
          return errorResponse(
            "Missing themeAnalysis or originalOrder for structure proposals",
            400
          );
        }
        const themeAnalysisStr = truncateToTokenBudget(JSON.stringify(themeAnalysis));
        const p = buildProposeStructuresPrompt(JSON.parse(themeAnalysisStr), originalOrder, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 3000;
        break;
      }
      case "detect-section": {
        if (!chunkText) {
          return errorResponse(
            "Missing chunkText for section detection",
            400
          );
        }
        const p = buildDetectSectionPrompt(chunkText, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 256;
        break;
      }
      case "pre-publication-check": {
        const biographyText = body.biographyText;
        if (!biographyText) {
          return errorResponse(
            "Missing biographyText for pre-publication check",
            400
          );
        }
        const p = buildPrePublicationCheckPrompt(truncateToTokenBudget(biographyText));
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 2048;
        break;
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }

    await supabase
      .from("ai_rate_limits")
      .insert({ user_id: user.id, action });

    let textContent: string;
    let modelUsed: string;

    try {
      const aiPayload = {
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };
      const { data: aiResult, modelUsed: usedModel } = await callAIWithFallback(
        aiPayload,
        infomaniakEndpoint,
        infomaniakToken
      );
      modelUsed = usedModel;
      const result = aiResult as any;
      textContent = result.choices?.[0]?.message?.content ?? "";
    } catch (apiError: any) {
      console.error("AI API error:", apiError);
      return errorResponse(
        apiError.message || "AI service error. Please try again.",
        502
      );
    }

    let parsed: any;
    if (action === "summary") {
      parsed = { summary: textContent };
    } else if (action === "rewrite") {
      parsed = { rewrittenText: textContent };
    } else if (action === "analyze-answer") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = {
          needsFollowUp: jsonData.needsFollowUp || false,
          followUpQuestion: jsonData.followUpQuestion,
          acknowledgment: jsonData.acknowledgment || "Thank you for sharing that.",
        };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    } else if (action === "recommend-next-section") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = {
          recommendedSection: jsonData.recommendedSection,
          reason: jsonData.reason || "",
          confidence: jsonData.confidence || "medium",
        };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    } else if (action === "analyze-themes") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = { analysis: jsonData.analysis || [] };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    } else if (action === "propose-structures") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = { proposals: jsonData.proposals || [] };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    } else if (action === "pre-publication-check") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = {
          passed: jsonData.passed ?? true,
          violation_level: jsonData.violation_level ?? null,
          flagged_passages: jsonData.flagged_passages ?? [],
          summary: jsonData.summary ?? "",
        };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    } else if (action === "detect-section") {
      try {
        const cleaned = extractJson(textContent);
        const jsonData = JSON.parse(cleaned);
        parsed = {
          section: jsonData.section || "childhood",
          confidence: jsonData.confidence || "low",
          reason: jsonData.reason || "",
          content: textContent,
        };
      } catch {
        parsed = {
          section: "childhood",
          confidence: "low",
          reason: "Failed to parse AI response",
          content: textContent,
        };
      }
    } else {
      try {
        const cleaned = extractJson(textContent);
        parsed = { data: JSON.parse(cleaned) };
      } catch {
        return errorResponse(
          "AI returned an invalid response. Please try again.",
          502
        );
      }
    }

    return new Response(JSON.stringify({ action, ...parsed, model_used: modelUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return errorResponse("Internal server error", 500);
  }
});
