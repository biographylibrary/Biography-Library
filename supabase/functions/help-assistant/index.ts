import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { HELP_KB } from "./help-kb.generated.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  de: "German",
};

const UNCERTAINTY_PHRASES = [
  "i don't know",
  "i'm not sure",
  "i cannot answer",
  "not covered",
  "outside the scope",
  "no information",
  "cannot help",
  "unable to answer",
  "not mentioned",
  "not described",
  "i do not have information",
  "i don't have information",
  "i'm unable",
  "i am unable",
  "not available in",
  "non lo so",
  "non sono sicuro",
  "non sono certa",
  "non so",
  "non ho informazioni",
  "non ho abbastanza",
  "non sono certo",
  "difficile dirlo",
  "potrebbe essere",
  "non è chiaro",
  "je ne sais pas",
  "je ne suis pas sûr",
  "je ne suis pas sure",
  "je n'ai pas d'information",
  "peut-être",
  "ich weiß nicht",
  "ich bin nicht sicher",
  "ich bin mir nicht sicher",
  "vielleicht",
  "keine informationen",
  "ich kann nicht",
];


function detectLowConfidence(text: string): boolean {
  const lower = text.toLowerCase();
  return UNCERTAINTY_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildSystemPrompt(language: string): string {
  const langName = LANGUAGE_NAMES[language] || "English";
  return `You are a helpful support assistant for Biography Library, a web application for writing and publishing personal biographies and memoirs.

You have a complete knowledge base about Biography Library. Answer directly and confidently from the knowledge base. Do NOT say you are unsure unless the topic is genuinely not covered in the knowledge base. If the topic IS covered in the knowledge base, give a clear direct answer without hedging.

Your role is to answer user questions about how to use Biography Library features.

RULES:
1. Answer ONLY questions about Biography Library features. Do not answer questions unrelated to the application.
2. Base your answers EXCLUSIVELY on the knowledge base provided below. Do not invent features, steps, or options that are not described in the knowledge base.
3. If the user's question IS covered in the knowledge base, answer it directly and confidently — never express uncertainty for topics the knowledge base covers.
4. If the user's question is genuinely not covered by the knowledge base at all, say clearly that you do not have information about that topic and suggest they contact support.
5. Respond in ${langName}. Always use ${langName} regardless of the language the user writes in.
6. Keep answers concise and helpful — aim for 3 to 6 sentences unless a step-by-step list is needed.
7. Do not repeat the question back to the user.
8. Never mention that you are using a knowledge base or that you are an AI.

KNOWLEDGE BASE:
${HELP_KB}`;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error("All retries failed");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const infomaniakToken = Deno.env.get("INFOMANIAK_AI_TOKEN") || "";
    const infomaniakEndpoint = Deno.env.get("INFOMANIAK_AI_ENDPOINT") || "";
    const primaryModel =
      Deno.env.get("INFOMANIAK_AI_MODEL_HELP_PRIMARY") ??
      Deno.env.get("INFOMANIAK_AI_MODEL_PRIMARY") ??
      "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8";
    const fallbackModel =
      Deno.env.get("INFOMANIAK_AI_MODEL_HELP_FALLBACK") ??
      Deno.env.get("INFOMANIAK_AI_MODEL_FALLBACK") ??
      "mistralai/Ministral-3-14B-Instruct-2512";

    if (!infomaniakToken) {
      return errorResponse("AI service is not configured.", 503);
    }

    if (!infomaniakEndpoint) {
      return errorResponse("AI endpoint is not configured.", 503);
    }

    const authHeader = req.headers.get("Authorization");
    console.log("[help-assistant] Authorization header present:", !!authHeader, "| prefix:", authHeader?.slice(0, 10));
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    console.log("[help-assistant] Token extracted, length:", token.length, "| starts with eyJ:", token.startsWith("eyJ"));

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log("[help-assistant] getUser result — user:", !!user, "| error:", authError?.message ?? null);

    if (authError || !user) {
      const isExpiry =
        authError?.message?.toLowerCase().includes("expired") ||
        authError?.status === 401;
      if (isExpiry) {
        return errorResponse("TOKEN_EXPIRED", 401);
      }
      return errorResponse("Unauthorized", 401);
    }

    let body: { question?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { question, language = "en" } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return errorResponse("Missing or empty question", 400);
    }

    const trimmedQuestion = question.trim().slice(0, 1000);
    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = trimmedQuestion;

    const aiPayload = {
      max_tokens: 512,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    let answerText = "";

    const models = [primaryModel, fallbackModel];
    let callSucceeded = false;
    let lastAiErrorStatus = 0;
    let lastAiErrorBody = "";

    console.log("[help-assistant] Starting AI call — endpoint:", infomaniakEndpoint, "| primary model:", primaryModel, "| token length:", infomaniakToken.length);

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        console.log(`[help-assistant] Calling model ${model} (attempt ${i + 1}/${models.length})`);
        const res = await callWithRetry(() =>
          fetch(infomaniakEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${infomaniakToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...aiPayload, model }),
            signal: AbortSignal.timeout(28000),
          })
        );

        console.log(`[help-assistant] Model ${model} responded with status:`, res.status);

        if (res.ok) {
          const data = await res.json();
          answerText = data?.choices?.[0]?.message?.content ?? "";
          console.log("[help-assistant] AI success — answer length:", answerText.length);
          callSucceeded = true;
          break;
        }

        if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 400) {
          const errText = await res.text();
          lastAiErrorStatus = res.status;
          lastAiErrorBody = errText;
          console.error("[help-assistant] AI 4xx error:", { model, status: res.status, body: errText });
          break;
        }

        if (res.status === 400) {
          const errText = await res.text();
          lastAiErrorStatus = res.status;
          lastAiErrorBody = errText;
          console.warn(`[help-assistant] Model ${model} returned 400 (possibly invalid model name), ${i < models.length - 1 ? "trying fallback" : "no more fallbacks"}:`, errText.slice(0, 200));
          continue;
        }

        lastAiErrorStatus = res.status;
        lastAiErrorBody = await res.text().catch(() => "");
        console.warn(`[help-assistant] Model ${model} failed (${res.status}): ${lastAiErrorBody.slice(0, 200)} — ${i < models.length - 1 ? "trying fallback" : "no more fallbacks"}`);
      } catch (err) {
        lastAiErrorBody = String(err);
        console.error(`[help-assistant] Model ${model} threw:`, err);
        if (i === models.length - 1) throw err;
        console.warn(`[help-assistant] Trying fallback after throw`);
      }
    }

    if (!callSucceeded || !answerText.trim()) {
      const detail = lastAiErrorBody
        ? `AI service error (HTTP ${lastAiErrorStatus}): ${lastAiErrorBody.slice(0, 300)}`
        : "AI service unavailable. Please try again later.";
      console.error("[help-assistant] Returning failure to client:", detail);
      return errorResponse(detail, 502);
    }

    const confidence = detectLowConfidence(answerText) ? "low" : "high";

    return new Response(
      JSON.stringify({ answer: answerText.trim(), confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("help-assistant error:", e);
    return errorResponse("Internal server error", 500);
  }
});
