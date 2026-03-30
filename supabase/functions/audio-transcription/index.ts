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

// CRITICAL: verifyJWT is false — JWT is validated internally via supabase.auth.getUser(token),
// mirroring the exact pattern used in ai-assistant/index.ts.
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

    if (!infomaniakToken) {
      return errorResponse(
        "Infomaniak AI is not configured. Please set INFOMANIAK_AI_TOKEN in Supabase secrets.",
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
    if (!contentType.includes("multipart/form-data")) {
      return errorResponse("Expected multipart/form-data", 400);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return errorResponse("Failed to parse multipart form data", 400);
    }

    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return errorResponse("Missing 'audio' file field in form data", 400);
    }

    if (audioFile.size === 0) {
      return errorResponse("Audio file is empty", 400);
    }

    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE_BYTES) {
      return errorResponse("Audio file exceeds 25 MB limit", 413);
    }

    // Determine MIME type and extension — preserve what was sent, fall back to webm
    const rawMime = audioFile.type || "audio/webm";
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/flac": "flac",
    };
    const mimeBase = rawMime.split(";")[0].trim();
    const ext = extMap[mimeBase] ?? "webm";
    const filename = `recording.${ext}`;

    // Re-wrap as a proper File with explicit name and type so the downstream
    // multipart body has a recognizable filename and Content-Type part header.
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: mimeBase });
    const namedFile = new File([audioBlob], filename, { type: mimeBase });

    const whisperFormData = new FormData();
    whisperFormData.append("file", namedFile, filename);
    whisperFormData.append("model", "openai/whisper-large-v3");

    const languageField = formData.get("language");
    if (languageField && typeof languageField === "string") {
      whisperFormData.append("language", languageField);
    }

    // Infomaniak chat completions endpoint format:
    //   https://api.infomaniak.com/2/ai/{product_id}/openai/v1/chat/completions
    // Whisper transcription endpoint format (confirmed from Infomaniak developer portal):
    //   https://api.infomaniak.com/1/ai/{product_id}/openai/audio/transcriptions
    // Transform: strip /v1 suffix, replace API version 2->1, drop /chat/completions
    const infomaniakEndpointBase = Deno.env.get("INFOMANIAK_AI_ENDPOINT") || "";
    let whisperEndpoint = "https://api.infomaniak.com/1/ai/openai/audio/transcriptions";
    if (infomaniakEndpointBase) {
      whisperEndpoint = infomaniakEndpointBase
        .replace(/^https:\/\/api\.infomaniak\.com\/\d+\//, "https://api.infomaniak.com/1/")
        .replace(/\/openai\/v\d+\/chat\/completions\/?$/, "/openai/audio/transcriptions")
        .replace(/\/openai\/chat\/completions\/?$/, "/openai/audio/transcriptions");
    }

    let whisperRes: Response;
    try {
      whisperRes = await fetch(whisperEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${infomaniakToken}`,
        },
        body: whisperFormData,
        signal: AbortSignal.timeout(60_000),
      });
    } catch (fetchErr: any) {
      console.error("Whisper fetch error:", fetchErr);
      return errorResponse(
        "Failed to reach transcription service. Please try again.",
        502
      );
    }

    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => "");
      console.error(`Infomaniak ${whisperRes.status} body:`, errText);
      if (whisperRes.status === 422) {
        console.error("Infomaniak 422 body:", errText);
      }
      return errorResponse(
        `Transcription service returned error ${whisperRes.status}.`,
        502
      );
    }

    let whisperJson: { text?: string };
    try {
      whisperJson = await whisperRes.json();
    } catch {
      return errorResponse("Invalid response from transcription service", 502);
    }

    const transcribedText = whisperJson.text ?? "";

    return new Response(JSON.stringify({ text: transcribedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audio-transcription edge function error:", e);
    return errorResponse("Internal server error", 500);
  }
});
