/**
 * Core of the log-error Edge Function — no Deno / npm: imports so Node tests can load it.
 */

export const VALID_LEVELS = ["critical", "error", "warn", "info"] as const;
export const MAX_MESSAGE_LEN = 1000;
export const MAX_METADATA_CHARS = 4000;
export const MAX_URL_LEN = 2000;
export const MAX_USER_AGENT_LEN = 500;
export const MAX_SOURCE_LEN = 200;
export const GLOBAL_RATE_LIMIT_PER_MIN = 60;
export const USER_RATE_LIMIT_PER_MIN = 20;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type CountResult = { count: number | null; error: unknown };

/** Filter builder returned by select().head count queries. */
export type CountQuery = {
  gte: (col: string, val: string) => CountQuery;
  eq: (col: string, val: string) => CountQuery;
  then: Promise<CountResult>["then"];
};

/** Minimal surface used from @supabase/supabase-js admin client. */
export type LogErrorAdmin = {
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string, opts: { count: "exact"; head: true }) => CountQuery;
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};

function truncate(val: unknown, max: number): string | null {
  if (typeof val !== "string") return null;
  return val.slice(0, max);
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function bearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
}

export async function resolveUserId(
  adminClient: LogErrorAdmin,
  token: string | null,
  anonKey: string | null
): Promise<string | null> {
  if (!token || !anonKey || token === anonKey) return null;
  try {
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function checkRateLimits(
  adminClient: LogErrorAdmin,
  userId: string | null
): Promise<"ok" | "global" | "user"> {
  const since = new Date(Date.now() - 60_000).toISOString();

  const globalRes = await adminClient
    .from("error_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);

  if (globalRes.error) return "ok";
  if ((globalRes.count ?? 0) > GLOBAL_RATE_LIMIT_PER_MIN) return "global";

  if (userId) {
    const userRes = await adminClient
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("user_id", userId);
    if (userRes.error) return "ok";
    if ((userRes.count ?? 0) > USER_RATE_LIMIT_PER_MIN) return "user";
  }

  return "ok";
}

export async function handleLogError(
  req: Request,
  deps: {
    adminClient: LogErrorAdmin;
    anonKey: string | null;
  }
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON" });
    }

    const level =
      typeof body.level === "string" && (VALID_LEVELS as readonly string[]).includes(body.level)
        ? body.level
        : "error";

    const message = truncate(body.message, MAX_MESSAGE_LEN);
    if (!message) {
      return jsonResponse(400, { ok: false, error: "message is required" });
    }

    let metadata: Record<string, unknown> | null = null;
    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      try {
        const serialized = JSON.stringify(body.metadata);
        if (serialized.length <= MAX_METADATA_CHARS) {
          metadata = body.metadata as Record<string, unknown>;
        }
      } catch {
        metadata = null;
      }
    }

    const url = truncate(body.url, MAX_URL_LEN);
    const userAgent = truncate(body.userAgent, MAX_USER_AGENT_LEN);
    const source = truncate(body.source, MAX_SOURCE_LEN);

    // Ignore body.userId — only a verified JWT (not the anon key) may set user_id.
    const token = bearerToken(req);
    const userId = await resolveUserId(deps.adminClient, token, deps.anonKey);

    const rate = await checkRateLimits(deps.adminClient, userId);
    if (rate !== "ok") {
      return jsonResponse(429, { ok: false, error: "rate_limited" });
    }

    const { error } = await deps.adminClient.from("error_logs").insert({
      level,
      message,
      metadata,
      url,
      user_agent: userAgent,
      user_id: userId,
      source,
    });

    if (error) {
      return jsonResponse(500, { ok: false });
    }

    return jsonResponse(200, { ok: true });
  } catch {
    return jsonResponse(500, { ok: false });
  }
}
