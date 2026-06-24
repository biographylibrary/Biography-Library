import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTransactionalEmail } from "../../../shared/email/send.ts";
import { getNotificationMessage } from "../../../shared/email/render.ts";
import { normalizeEmailLocale } from "../../../shared/email/locale.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_LIMIT = 50;

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

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (Deno.env.get("ENGAGEMENT_EMAILS_ENABLED") === "false") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reminderDays = Number(Deno.env.get("PDF_DRAFT_REMINDER_DAYS") ?? "7");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://app.biographylibrary.org").replace(/\/$/, "");
  const resendEnv = {
    apiKey: Deno.env.get("RESEND_API_KEY"),
    from: Deno.env.get("RESEND_FROM_EMAIL"),
    siteName: Deno.env.get("SITE_NAME") ?? "Biography Library",
    siteUrl,
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const nowIso = new Date().toISOString();
  let g1Sent = 0;
  let g2Sent = 0;

  const { data: chapterRows } = await supabase
    .from("biographies")
    .select("id, title, user_id, content_language, next_chapter_available_at, chapters_count")
    .eq("status", "published")
    .gte("chapters_count", 1)
    .lte("next_chapter_available_at", nowIso)
    .is("chapter_available_email_sent_at", null)
    .limit(BATCH_LIMIT);

  for (const row of chapterRows ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, language")
      .eq("id", row.user_id)
      .maybeSingle();

    const email = profile?.email;
    if (!email) continue;

    const locale = normalizeEmailLocale(profile?.language ?? row.content_language);
    const availableDate = row.next_chapter_available_at
      ? new Date(row.next_chapter_available_at).toLocaleDateString(locale)
      : "";

    try {
      await sendTransactionalEmail({
        to: email,
        templateId: "engagement_chapter_available",
        locale,
        vars: {
          biographyTitle: row.title ?? "",
          availableDate,
          editorUrl: `${siteUrl}/biography/${row.id}/edit`,
        },
        idempotencyKey: `chapter-available/${row.id}/${row.next_chapter_available_at}`,
        env: resendEnv,
      });

      await supabase.from("user_notifications").insert({
        user_id: row.user_id,
        message: getNotificationMessage("engagement_chapter_available", locale, {
          biographyTitle: row.title ?? "",
          availableDate,
        }),
      });

      await supabase
        .from("biographies")
        .update({ chapter_available_email_sent_at: nowIso })
        .eq("id", row.id);

      g1Sent += 1;
    } catch (err) {
      console.error("[engagement] G1 failed", row.id, err);
    }
  }

  const staleBefore = new Date(Date.now() - reminderDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: draftRows } = await supabase
    .from("biographies")
    .select("id, title, user_id, content_language, pdf_draft_started_at, pdf_draft_iteration, updated_at")
    .eq("status", "pdf_draft")
    .not("pdf_draft_started_at", "is", null)
    .lte("updated_at", staleBefore)
    .is("pdf_draft_reminder_sent_at", null)
    .limit(BATCH_LIMIT);

  for (const row of draftRows ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, language")
      .eq("id", row.user_id)
      .maybeSingle();

    const email = profile?.email;
    if (!email) continue;

    const locale = normalizeEmailLocale(profile?.language ?? row.content_language);
    const iteration = row.pdf_draft_iteration ?? 1;

    try {
      await sendTransactionalEmail({
        to: email,
        templateId: "engagement_pdf_draft_reminder",
        locale,
        vars: {
          biographyTitle: row.title ?? "",
          draftIteration: String(iteration),
          editorUrl: `${siteUrl}/biography/${row.id}/edit`,
        },
        idempotencyKey: `pdf-draft-reminder/${row.id}/${row.pdf_draft_started_at}`,
        env: resendEnv,
      });

      await supabase.from("user_notifications").insert({
        user_id: row.user_id,
        message: getNotificationMessage("engagement_pdf_draft_reminder", locale, {
          biographyTitle: row.title ?? "",
          draftIteration: String(iteration),
        }),
      });

      await supabase
        .from("biographies")
        .update({ pdf_draft_reminder_sent_at: nowIso })
        .eq("id", row.id);

      g2Sent += 1;
    } catch (err) {
      console.error("[engagement] G2 failed", row.id, err);
    }
  }

  return new Response(JSON.stringify({ ok: true, g1Sent, g2Sent }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
