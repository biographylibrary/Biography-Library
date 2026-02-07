import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  de: "German",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

function getLangName(lang: string): string {
  return LANGUAGE_NAMES[lang] || "English";
}

function buildGrammarPrompt(sectionTitle: string, content: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `You are a skilled editor helping with a biography written in ${langName}. Review text for grammar, spelling, clarity, and style in ${langName}. Preserve the author's voice and tone. Respond in ${langName}. Return a JSON array of suggestions. Each suggestion must have: "id" (unique string), "original" (the problematic text), "suggestion" (the corrected text), "explanation" (brief reason in ${langName}). If the text is already good, return an empty array. Return ONLY valid JSON, no markdown fences.`,
    user: `Section: "${sectionTitle}"\n\nText to review:\n${content}`,
  };
}

function buildPromptsPrompt(sectionKey: string, sectionTitle: string, language: string) {
  const langName = getLangName(language);
  return {
    system: `You are a warm, empathetic biography writing coach. Generate 5 thoughtful questions in ${langName} that help someone recall memories and stories for the given biography section. Questions should be specific, personal, and spark vivid memories. All text must be in ${langName}. Return a JSON array of objects with "prompt" (the question in ${langName}) and "starter" (a 5-8 word writing starter in ${langName} based on the question). Return ONLY valid JSON, no markdown fences.`,
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
    system: `You are an empathetic biography interviewer. Analyze the user's answer to determine if it needs a follow-up question for more detail.

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
}

Return ONLY valid JSON, no markdown fences.`,
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
    system: `You are a biography writing coach helping someone write their life story in ${langName}. The user just completed a section. Based on the content they wrote, recommend which section they should work on next.

Consider:
1. Natural chronological flow (childhood → education → career → relationships → legacy)
2. Topics they mentioned but didn't fully explore (e.g., they mentioned "studying medicine" → recommend Education section)
3. Emotional readiness (avoid suggesting heavy topics like Challenges too early unless they're ready)
4. Building narrative momentum (if they wrote about career success, relationships or passions might be good next)

Available sections to recommend from:
${availableSectionsWithDesc}

Already completed: ${completedSections.join(', ') || 'none'}

Return a JSON object with:
{
  "recommendedSection": "section-key" (must be one of the available sections),
  "reason": "brief explanation in ${langName} (1-2 sentences, personal and encouraging)",
  "confidence": "high" | "medium" | "low"
}

Return ONLY valid JSON, no markdown fences.`,
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

async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  anthropicKey: string
) {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Claude API error:", {
      status: response.status,
      body: errText,
    });

    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your ANTHROPIC_API_KEY.");
    }

    if (response.status === 404) {
      throw new Error("AI model not found. The configured model may not be available.");
    }

    throw new Error(`Claude API error (${response.status}). Please try again.`);
  }

  const result = await response.json();
  return result.content?.[0]?.text ?? "";
}

async function callEuriaAPI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  euriaKey: string,
  euriaUrl: string
) {
  const response = await fetch(euriaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${euriaKey}`,
    },
    body: JSON.stringify({
      model: "euria-chat",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Euria API error:", {
      status: response.status,
      body: errText,
    });

    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your EURIA_API_KEY.");
    }

    throw new Error(`Euria API error (${response.status}). Please try again.`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? result.content ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiProvider = (Deno.env.get("AI_PROVIDER") || "claude").toLowerCase();

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    const euriaKey = Deno.env.get("EURIA_API_KEY") || "";
    const euriaUrl = Deno.env.get("EURIA_API_URL") || "https://api.infomaniak.com/1/ai/chat";

    if (aiProvider === "claude" && !anthropicKey) {
      return errorResponse(
        "Claude AI is not configured. Please set ANTHROPIC_API_KEY in Supabase Dashboard > Project Settings > Edge Functions > Manage secrets.",
        503
      );
    }

    if (aiProvider === "euria" && !euriaKey) {
      return errorResponse(
        "Euria AI is not configured. Please set EURIA_API_KEY in Supabase Dashboard > Project Settings > Edge Functions > Manage secrets.",
        503
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
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
      availableSections
    } = body;

    if (!action) {
      return errorResponse("Missing action parameter", 400);
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
        const p = buildRewritePrompt(sectionTitle, content, tone, language);
        systemPrompt = p.system;
        userPrompt = p.user;
        maxTokens = 4096;
        break;
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }

    await supabase
      .from("ai_rate_limits")
      .insert({ user_id: user.id, action });

    let textContent: string;

    try {
      if (aiProvider === "claude") {
        textContent = await callClaudeAPI(
          systemPrompt,
          userPrompt,
          maxTokens,
          anthropicKey!
        );
      } else if (aiProvider === "euria") {
        textContent = await callEuriaAPI(
          systemPrompt,
          userPrompt,
          maxTokens,
          euriaKey!,
          euriaUrl
        );
      } else {
        return errorResponse(
          `Unknown AI provider: ${aiProvider}. Supported providers: claude, euria`,
          400
        );
      }
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

    return new Response(JSON.stringify({ action, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return errorResponse("Internal server error", 500);
  }
});
