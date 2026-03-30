import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractProductId(endpoint: string): string | null {
  const match = endpoint.match(/\/ai\/(\d+)\//);
  return match ? match[1] : null;
}

// CRITICAL: verifyJWT is false — JWT is validated internally via supabase.auth.getUser(token)
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const infomaniakToken = Deno.env.get("INFOMANIAK_AI_TOKEN") || "";
    const infomaniakEndpoint = Deno.env.get("INFOMANIAK_AI_ENDPOINT") || "";

    if (!infomaniakToken) {
      return errorResponse(
        "Infomaniak AI is not configured. Please set INFOMANIAK_AI_TOKEN in Supabase secrets.",
        503
      );
    }

    const productId = extractProductId(infomaniakEndpoint);
    if (!productId) {
      return errorResponse(
        "Could not determine product_id from INFOMANIAK_AI_ENDPOINT.",
        503
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      const isExpiry =
        authError?.message?.toLowerCase().includes("expired") ||
        authError?.message?.toLowerCase().includes("token is expired") ||
        authError?.status === 401;
      if (isExpiry) {
        return errorResponse("TOKEN_EXPIRED", 401);
      }
      return errorResponse("Unauthorized", 401);
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorResponse("Expected application/json body", 400);
    }

    let body: { audio?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Failed to parse JSON body", 400);
    }

    if (!body.audio || typeof body.audio !== "string") {
      return errorResponse("Missing 'audio' base64 string in request body", 400);
    }

    const transcriptionUrl = `https://api.infomaniak.com/1/ai/${productId}/openai/audio/transcriptions`;
    const resultsBaseUrl = `https://api.infomaniak.com/1/ai/${productId}/results`;

    console.log("Transcription URL:", transcriptionUrl);
    console.log("Language:", body.language || "not specified");
    console.log("Audio base64 length:", body.audio.length);

    const requestBody: Record<string, string> = {
      file: body.audio,
      model: "whisper",
    };
    if (body.language) {
      requestBody.language = body.language;
    }

    console.log("Model field:", "whisper");

    let startRes: Response;
    try {
      startRes = await fetch(transcriptionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${infomaniakToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (fetchErr: any) {
      console.error("Transcription start fetch error:", fetchErr);
      return errorResponse(
        "Failed to reach transcription service. Please try again.",
        502
      );
    }

    console.log("Infomaniak transcription start status:", startRes.status);
    const startText = await startRes.text();
    console.log("Infomaniak transcription start body:", startText);

    if (!startRes.ok) {
      return errorResponse(
        `Transcription service returned error ${startRes.status}: ${startText}`,
        502
      );
    }

    let startJson: { batch_id?: string };
    try {
      startJson = JSON.parse(startText);
    } catch {
      return errorResponse("Invalid response from transcription service", 502);
    }

    const batchId = startJson.batch_id;
    if (!batchId) {
      return errorResponse("Transcription service did not return a batch_id", 502);
    }

    console.log("Batch ID:", batchId);

    const pollUrl = `${resultsBaseUrl}/${batchId}`;
    console.log("Polling URL:", pollUrl);

    const POLL_INTERVAL_MS = 2000;
    const MAX_WAIT_MS = 60_000;
    const started = Date.now();

    while (Date.now() - started < MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let pollRes: Response;
      try {
        pollRes = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${infomaniakToken}`,
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (pollErr: any) {
        console.error("Poll fetch error:", pollErr);
        continue;
      }

      console.log("Infomaniak poll status:", pollRes.status);
      const pollText = await pollRes.text();
      console.log("Infomaniak poll body:", pollText);

      if (!pollRes.ok) {
        return errorResponse(
          `Polling returned error ${pollRes.status}: ${pollText}`,
          502
        );
      }

      let pollJson: { status?: string; text?: string; result?: { text?: string } };
      try {
        pollJson = JSON.parse(pollText);
      } catch {
        return errorResponse("Invalid poll response from transcription service", 502);
      }

      const status = pollJson.status;
      if (status === "complete" || status === "completed" || status === "success") {
        const transcribedText =
          pollJson.text ?? pollJson.result?.text ?? "";
        console.log("Transcription complete. Text length:", transcribedText.length);
        return new Response(JSON.stringify({ text: transcribedText }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (status === "failed" || status === "error") {
        return errorResponse("Transcription job failed on server", 502);
      }

      console.log("Poll status:", status, "— continuing to wait...");
    }

    return errorResponse("Transcription timed out after 60 seconds", 504);
  } catch (e) {
    console.error("audio-transcription edge function error:", e);
    return errorResponse("Internal server error", 500);
  }
});
