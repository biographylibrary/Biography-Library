import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTHOR_REMINDER_DAYS,
  AUTHOR_REVISION_DAYS,
  DOCUMENTATION_DAYS,
  REVIEWER_REMINDER_DAYS,
  dueDayReminders,
  isPastDays,
  reportClosedAt,
  reporterPiiDue,
  type AuthorReminderDay,
  type ReviewerReminderDay,
} from '@/lib/moderation/report-deadlines';
import { notifyAuthorPublicationEmail } from '@/lib/server/email/publication-helpers';
import { sendTemplateEmail } from '@/lib/server/email';
import { writeModerationMessage } from '@/lib/server/moderation-register';

type AnyClient = SupabaseClient<any, any, any>;

type ReportRow = {
  id: string;
  biography_id: string;
  created_at: string;
  decided_at: string | null;
  appeal_decided_at: string | null;
  status: string;
  report_type: string;
  reporter_id: string | null;
  reporter_email: string | null;
  reporter_name: string | null;
  assigned_to: string | null;
  receipt_sent_at: string | null;
  author_revision_requested_at: string | null;
  reviewer_reminder_7_sent_at: string | null;
  reviewer_reminder_21_sent_at: string | null;
  reviewer_reminder_28_sent_at: string | null;
  author_reminder_7_sent_at: string | null;
  author_reminder_25_sent_at: string | null;
  documentation_overdue_noted_at: string | null;
  reporter_pii_erased_at: string | null;
  biographies: { status: string; user_id: string | null; title: string | null } | { status: string; user_id: string | null; title: string | null }[] | null;
};

function bioOf(row: ReportRow): { status: string; user_id: string | null; title: string | null } | null {
  const value = row.biographies;
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const REVIEWER_COLUMNS: Record<ReviewerReminderDay, string> = {
  7: 'reviewer_reminder_7_sent_at',
  21: 'reviewer_reminder_21_sent_at',
  28: 'reviewer_reminder_28_sent_at',
};

const AUTHOR_COLUMNS: Record<AuthorReminderDay, string> = {
  7: 'author_reminder_7_sent_at',
  25: 'author_reminder_25_sent_at',
};

async function staffPeople(svc: AnyClient): Promise<Array<{ id: string; email: string | null; language: string | null }>> {
  const { data } = await svc
    .from('profiles')
    .select('id, email, language')
    .in('role', ['reviewer', 'admin', 'super_admin']);
  return (data ?? []) as Array<{ id: string; email: string | null; language: string | null }>;
}

async function mark(svc: AnyClient, id: string, column: string, now: string): Promise<void> {
  const { error } = await svc.from('moderation_reports').update({ [column]: now }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function runReportDeadlines(svc: AnyClient, now = new Date()): Promise<{
  receipts: number;
  reviewerReminders: number;
  authorReminders: number;
  overdue: number;
  documentationNoted: number;
  piiErased: number;
}> {
  const summary = {
    receipts: 0,
    reviewerReminders: 0,
    authorReminders: 0,
    overdue: 0,
    documentationNoted: 0,
    piiErased: 0,
  };
  const nowIso = now.toISOString();
  const staff = await staffPeople(svc);

  const { data, error } = await svc
    .from('moderation_reports')
    .select(`
      id, biography_id, created_at, decided_at, appeal_decided_at, status, report_type,
      reporter_id, reporter_email, reporter_name, assigned_to, receipt_sent_at,
      author_revision_requested_at,
      reviewer_reminder_7_sent_at, reviewer_reminder_21_sent_at, reviewer_reminder_28_sent_at,
      author_reminder_7_sent_at, author_reminder_25_sent_at,
      documentation_overdue_noted_at, reporter_pii_erased_at,
      biographies!biography_id ( status, user_id, title )
    `)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw new Error(error.message);

  for (const raw of (data ?? []) as ReportRow[]) {
    const bio = bioOf(raw);
    const senderId = raw.assigned_to || bio?.user_id;
    if (!senderId) continue;

    if (!raw.receipt_sent_at) {
      const sent = await sendReceipt(svc, raw);
      if (sent) {
        await mark(svc, raw.id, 'receipt_sent_at', nowIso);
        await writeModerationMessage(svc, {
          reportId: raw.id,
          senderId,
          recipientId: raw.reporter_id,
          internal: true,
          message: 'Receipt sent to the reporter.',
        });
        summary.receipts += 1;
      }
    }

    if (raw.status !== 'decided') {
      const sentFlags = [
        Boolean(raw.reviewer_reminder_7_sent_at),
        Boolean(raw.reviewer_reminder_21_sent_at),
        Boolean(raw.reviewer_reminder_28_sent_at),
      ];
      const due = dueDayReminders(raw.created_at, now, REVIEWER_REMINDER_DAYS, sentFlags);
      for (const day of due) {
        await remindReviewers(staff, raw, day as ReviewerReminderDay);
        await mark(svc, raw.id, REVIEWER_COLUMNS[day as ReviewerReminderDay], nowIso);
        await writeModerationMessage(svc, {
          reportId: raw.id,
          senderId,
          internal: true,
          message: `Reviewer reminder sent at day ${day} of 30.`,
        });
        summary.reviewerReminders += 1;
      }
    }

    if (bio?.status === 'revision_requested' && raw.author_revision_requested_at && bio.user_id) {
      if (isPastDays(raw.author_revision_requested_at, now, AUTHOR_REVISION_DAYS)) {
        const { data: moved, error: statusErr } = await svc
          .from('biographies')
          .update({ status: 'revision_overdue' })
          .eq('id', raw.biography_id)
          .eq('status', 'revision_requested')
          .select('id');
        if (statusErr) throw new Error(statusErr.message);
        if (moved?.length) {
        await writeModerationMessage(svc, {
          reportId: raw.id,
          senderId,
          recipientId: bio.user_id,
          message: 'The 30 days to send the revision passed. The biography stays out of the public catalog.',
        });
        try {
          await notifyAuthorPublicationEmail({
            client: svc,
            authorId: bio.user_id,
            biographyId: raw.biography_id,
            templateId: 'report_revision_overdue',
            notificationMessage: 'The 30 days to send the revision passed. The biography stays out of the public catalog.',
          });
        } catch (err) {
          console.error('[report-deadlines] overdue email', err);
        }
        summary.overdue += 1;
        }
      } else {
        const sentFlags = [Boolean(raw.author_reminder_7_sent_at), Boolean(raw.author_reminder_25_sent_at)];
        const due = dueDayReminders(raw.author_revision_requested_at, now, AUTHOR_REMINDER_DAYS, sentFlags);
        for (const day of due) {
          try {
            await notifyAuthorPublicationEmail({
              client: svc,
              authorId: bio.user_id,
              biographyId: raw.biography_id,
              templateId: 'report_author_revision_reminder',
              vars: { day: String(day) },
              notificationMessage: `Reminder: ${day} of 30 days to send the revision.`,
              idempotencyKey: `report-author-reminder/${raw.id}/${day}`,
            });
          } catch (err) {
            console.error('[report-deadlines] author reminder', err);
          }
          await mark(svc, raw.id, AUTHOR_COLUMNS[day as AuthorReminderDay], nowIso);
          await writeModerationMessage(svc, {
            reportId: raw.id,
            senderId,
            recipientId: bio.user_id,
            internal: true,
            message: `Author reminder sent at day ${day} of 30.`,
          });
          summary.authorReminders += 1;
        }
      }
    }

    if (
      bio?.status === 'suspended_pending_verification' &&
      !raw.documentation_overdue_noted_at &&
      (raw.report_type === 'living_person' || raw.report_type === 'illegal_content') &&
      isPastDays(raw.created_at, now, DOCUMENTATION_DAYS)
    ) {
      await mark(svc, raw.id, 'documentation_overdue_noted_at', nowIso);
      await writeModerationMessage(svc, {
        reportId: raw.id,
        senderId,
        recipientId: bio.user_id,
        message: '14 days passed without the requested document. The biography stays out of the public catalog for a reviewer decision.',
      });
      await remindReviewers(staff, raw, 14);
      summary.documentationNoted += 1;
    }

    if (!raw.reporter_id && (raw.reporter_email || raw.reporter_name)) {
      const closed = reportClosedAt(raw.decided_at, raw.appeal_decided_at);
      if (reporterPiiDue(closed, now, Boolean(raw.reporter_pii_erased_at))) {
        const { error: wipeErr } = await svc
          .from('moderation_reports')
          .update({
            reporter_email: null,
            reporter_name: null,
            reporter_pii_erased_at: nowIso,
          })
          .eq('id', raw.id);
        if (wipeErr) throw new Error(wipeErr.message);
        await writeModerationMessage(svc, {
          reportId: raw.id,
          senderId,
          internal: true,
          message: 'Name and email of the unregistered reporter were deleted 12 months after the case closed. The decision stays on record.',
        });
        summary.piiErased += 1;
      }
    }
  }

  return summary;
}

async function sendReceipt(svc: AnyClient, row: ReportRow): Promise<boolean> {
  let email = row.reporter_email;
  let locale: string | null = null;
  if (!email && row.reporter_id) {
    const { data } = await svc.from('profiles').select('email, language').eq('id', row.reporter_id).maybeSingle();
    email = (data as { email?: string | null } | null)?.email ?? null;
    locale = (data as { language?: string | null } | null)?.language ?? null;
  }
  if (!email) return false;
  const title = bioOf(row)?.title ?? '';
  try {
    await sendTemplateEmail({
      to: email,
      templateId: 'report_receipt',
      locale,
      vars: { biographyTitle: title },
      idempotencyKey: `report-receipt/${row.id}`,
    });
    return true;
  } catch (err) {
    console.error('[report-deadlines] receipt', err);
    return false;
  }
}

async function remindReviewers(
  staff: Array<{ id: string; email: string | null; language: string | null }>,
  row: ReportRow,
  day: number,
): Promise<void> {
  for (const person of staff) {
    if (!person.email) continue;
    try {
      await sendTemplateEmail({
        to: person.email,
        templateId: 'report_reviewer_reminder',
        locale: person.language,
        vars: { day: String(day), biographyTitle: bioOf(row)?.title ?? '' },
        idempotencyKey: `report-reviewer-reminder/${row.id}/${person.id}/${day}`,
      });
    } catch (err) {
      console.error('[report-deadlines] reviewer reminder', err);
    }
  }
}
