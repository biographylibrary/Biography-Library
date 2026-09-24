import type { SupabaseClient } from '@supabase/supabase-js';
import { laneEffect, laneRegisterMessage, type LaneEffect } from '@/lib/moderation/report-lane-effect';
import type { ReportOrigin, ReportType } from '@/lib/moderation/types';
import { notifyAuthorPublicationEmail } from '@/lib/server/email/publication-helpers';
import { sendTemplateEmail } from '@/lib/server/email';
import { writeModerationMessage } from '@/lib/server/moderation-register';

type AnyClient = SupabaseClient<any, any, any>;

export type OpenReportInput = {
  biographyId: string;
  reportType: ReportType;
  description: string | null;
  origin: ReportOrigin;
  reporterId: string | null;
  reporterEmail: string | null;
  reporterName: string | null;
  senderId: string;
};

export type OpenReportResult = {
  reportId: string;
  effect: LaneEffect;
};

function recordLanguage(bio: { record_language_tag?: string | null; content_language?: string | null }): string {
  return ((bio.record_language_tag || bio.content_language || 'en').split('-')[0] || 'en').toLowerCase();
}

async function notifyImmediateReviewers(
  svc: AnyClient,
  biographyId: string,
  reportId: string,
): Promise<void> {
  const { data: staff } = await svc
    .from('profiles')
    .select('id, email, language')
    .in('role', ['reviewer', 'admin', 'super_admin']);

  for (const person of staff ?? []) {
    const row = person as { id: string; email?: string | null; language?: string | null };
    try {
      await svc.from('user_notifications').insert({
        user_id: row.id,
        message: 'High-priority report: the biography was suspended pending verification.',
      });
      if (row.email) {
        await sendTemplateEmail({
          to: row.email,
          templateId: 'report_immediate_reviewer',
          locale: row.language,
          vars: { biographyId },
          idempotencyKey: `report-immediate-reviewer/${row.id}/${reportId}`,
        });
      }
    } catch (err) {
      console.error('[open-moderation-report] reviewer notify', err);
    }
  }
}

export async function openModerationReport(
  svc: AnyClient,
  input: OpenReportInput,
): Promise<OpenReportResult> {
  const { data: bio, error: bioErr } = await svc
    .from('biographies')
    .select('id, status, user_id, title, record_language_tag, content_language')
    .eq('id', input.biographyId)
    .maybeSingle();

  if (bioErr || !bio) throw new Error('Biography not found');

  const status = (bio as { status: string }).status;
  const effect = laneEffect(input.reportType, status);
  const nextStatus = effect.kind === 'suspend'
    ? 'suspended_pending_verification'
    : effect.kind === 'remove'
      ? 'removed'
      : null;

  const { data: inserted, error: insertErr } = await svc
    .from('moderation_reports')
    .insert({
      biography_id: input.biographyId,
      report_type: input.reportType,
      description: input.description,
      reporter_id: input.reporterId,
      reporter_email: input.reporterEmail,
      reporter_name: input.reporterName,
      origin: input.origin,
      status: 'unassigned',
      biography_status_before_decision: nextStatus ? status : null,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) throw new Error(insertErr?.message ?? 'Failed to open report');
  const reportId = (inserted as { id: string }).id;

  if (nextStatus) {
    const { error: statusErr } = await svc
      .from('biographies')
      .update({ status: nextStatus })
      .eq('id', input.biographyId)
      .eq('status', 'published');
    if (statusErr) throw new Error(statusErr.message);
  }

  const lang = recordLanguage(bio as { record_language_tag?: string | null; content_language?: string | null });
  const { error: msgErr } = await svc.from('moderation_messages').insert({
    report_id: reportId,
    sender_id: input.senderId,
    recipient_id: (bio as { user_id?: string | null }).user_id ?? null,
    is_internal: false,
    message: laneRegisterMessage(lang, effect),
  });
  if (msgErr) throw new Error(msgErr.message);

  const authorId = (bio as { user_id?: string | null }).user_id;
  if (authorId && effect.kind === 'suspend') {
    try {
      await notifyAuthorPublicationEmail({
        client: svc,
        authorId,
        biographyId: input.biographyId,
        templateId: 'report_immediate_author',
        notificationMessage: laneRegisterMessage(lang, effect),
      });
    } catch (err) {
      console.error('[open-moderation-report] author email', err);
    }
    await notifyImmediateReviewers(svc, input.biographyId, reportId);
  }

  if (authorId && effect.kind === 'remove') {
    try {
      await notifyAuthorPublicationEmail({
        client: svc,
        authorId,
        biographyId: input.biographyId,
        templateId: 'publication_removed',
        notificationMessage: laneRegisterMessage(lang, effect),
      });
    } catch (err) {
      console.error('[open-moderation-report] removal email', err);
    }
  }

  let receiptEmail = input.reporterEmail;
  let receiptLocale: string | null = null;
  if (!receiptEmail && input.reporterId) {
    const { data: profile } = await svc
      .from('profiles')
      .select('email, language')
      .eq('id', input.reporterId)
      .maybeSingle();
    receiptEmail = (profile as { email?: string | null } | null)?.email ?? null;
    receiptLocale = (profile as { language?: string | null } | null)?.language ?? null;
  }
  if (receiptEmail) {
    try {
      await sendTemplateEmail({
        to: receiptEmail,
        templateId: 'report_receipt',
        locale: receiptLocale,
        vars: { biographyTitle: (bio as { title?: string | null }).title ?? '' },
        idempotencyKey: `report-receipt/${reportId}`,
      });
      await svc.from('moderation_reports').update({ receipt_sent_at: new Date().toISOString() }).eq('id', reportId);
      await writeModerationMessage(svc, {
        reportId,
        senderId: input.senderId,
        recipientId: input.reporterId,
        internal: true,
        message: 'Receipt sent to the reporter.',
      });
    } catch (err) {
      console.error('[open-moderation-report] receipt', err);
    }
  }

  return { reportId, effect };
}
