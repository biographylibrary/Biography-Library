import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { sendTransactionalEmail } from "../../../shared/email/send.ts";
import { normalizeEmailLocale } from "../../../shared/email/locale.ts";
import type { EmailTemplateId } from "../../../shared/email/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, webhook-id, webhook-timestamp, webhook-signature",
};

type AuthEmailPayload = {
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

function buildConfirmUrl(payload: AuthEmailPayload): string {
  const site = payload.email_data.site_url.replace(/\/$/, "");
  const redirect = encodeURIComponent(payload.email_data.redirect_to || `${site}/auth/callback`);
  const type = payload.email_data.email_action_type;
  return `${site}/auth/v1/verify?token=${payload.email_data.token_hash}&type=${type}&redirect_to=${redirect}`;
}

function templateForAction(action: string): EmailTemplateId | null {
  switch (action) {
    case "signup":
    case "invite":
      return "auth_confirm_signup";
    case "recovery":
      return "auth_reset_password";
    case "email_change":
      return "auth_email_change";
    default:
      return null;
  }
}

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

  const hookSecret = Deno.env.get("AUTH_HOOK_SECRET");
  if (!hookSecret) {
    console.error("[auth-send-email] AUTH_HOOK_SECRET missing");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret.replace(/^v1,whsec_/, ""));

  let payload: AuthEmailPayload;
  try {
    payload = wh.verify(payloadText, headers) as AuthEmailPayload;
  } catch (err) {
    console.error("[auth-send-email] webhook verify failed", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const to = payload.user.email;
  if (!to) {
    return new Response(JSON.stringify({ error: "Missing email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const templateId = templateForAction(payload.email_data.email_action_type);
  if (!templateId) {
    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locale = normalizeEmailLocale(
    typeof payload.user.user_metadata?.language === "string"
      ? payload.user.user_metadata.language
      : "en",
  );

  const confirmUrl = buildConfirmUrl(payload);

  try {
    await sendTransactionalEmail({
      to,
      templateId,
      locale,
      vars: { confirmUrl },
      idempotencyKey: `${templateId}/${to}/${payload.email_data.token_hash}`,
      env: {
        apiKey: Deno.env.get("RESEND_API_KEY"),
        from: Deno.env.get("RESEND_FROM_EMAIL"),
        siteName: Deno.env.get("SITE_NAME") ?? "Biography Library",
        siteUrl: Deno.env.get("SITE_URL") ?? payload.email_data.site_url,
      },
    });
  } catch (err) {
    console.error("[auth-send-email] send failed", err);
    return new Response(JSON.stringify({ error: "Failed to send" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
