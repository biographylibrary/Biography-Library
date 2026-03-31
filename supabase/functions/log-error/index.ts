import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_LEVELS = ["critical", "error", "warn", "info"];
const MAX_MESSAGE_LEN = 2000;
const MAX_URL_LEN = 2000;
const MAX_USER_AGENT_LEN = 500;
const MAX_SOURCE_LEN = 200;

function truncate(val: unknown, max: number): string | null {
  if (typeof val !== "string") return null;
  return val.slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const level = typeof body.level === "string" && VALID_LEVELS.includes(body.level)
      ? body.level
      : "error";

    const message = truncate(body.message, MAX_MESSAGE_LEN);
    if (!message) {
      return new Response(
        JSON.stringify({ ok: false, error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let metadata: Record<string, unknown> | null = null;
    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      try {
        const serialized = JSON.stringify(body.metadata);
        if (serialized.length <= 10000) {
          metadata = body.metadata as Record<string, unknown>;
        }
      } catch {
        metadata = null;
      }
    }

    const url = truncate(body.url, MAX_URL_LEN);
    const userAgent = truncate(body.userAgent, MAX_USER_AGENT_LEN);
    const source = truncate(body.source, MAX_SOURCE_LEN);

    let userId: string | null = null;
    if (typeof body.userId === "string" && body.userId.length <= 100) {
      userId = body.userId;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await adminClient.from("error_logs").insert({
      level,
      message,
      metadata,
      url,
      user_agent: userAgent,
      user_id: userId,
      source,
    });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
