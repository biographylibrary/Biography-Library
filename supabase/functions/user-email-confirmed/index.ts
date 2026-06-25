import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../../../shared/email/send.ts";
import { resolveUserEmailLocale } from "../../../shared/email/locale.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-webhook-secret",
};

type WebhookBody = {
  type?: string;
  record?: {
    id?: string;
    email?: string;
    email_confirmed_at?: string | null;
    raw_user_meta_data?: Record<string, unknown>;
  };
  old_record?: {
    email_confirmed_at?: string | null;
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("CRON_SECRET");
  if (webhookSecret && req.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const record = body.record;
  const oldRecord = body.old_record;
  if (!record?.id || !record.email) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const wasConfirmed = !!oldRecord?.email_confirmed_at;
  const isConfirmed = !!record.email_confirmed_at;
  if (wasConfirmed || !isConfirmed) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("welcome_email_sent_at, language")
    .eq("id", record.id)
    .maybeSingle();

  if (profile?.welcome_email_sent_at) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "already_sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locale = resolveUserEmailLocale({
    profileLanguage: profile?.language,
    signupLanguage:
      typeof record.raw_user_meta_data?.language === "string"
        ? record.raw_user_meta_data.language
        : null,
  });

  try {
    await sendTransactionalEmail({
      to: record.email,
      templateId: "welcome",
      locale,
      idempotencyKey: `welcome/${record.id}`,
      env: {
        apiKey: Deno.env.get("RESEND_API_KEY"),
        from: Deno.env.get("RESEND_FROM_EMAIL"),
        siteName: Deno.env.get("SITE_NAME") ?? "Biography Library",
        siteUrl: Deno.env.get("SITE_URL") ?? "https://app.biographylibrary.org",
      },
    });

    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", record.id);

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[user-email-confirmed]", err);
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
