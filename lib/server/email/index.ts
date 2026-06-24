import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeEmailLocale } from '@shared/email/locale';
import { getNotificationMessage } from '@shared/email/render';
import { sendTransactionalEmail } from '@shared/email/send';
import type { EmailLocale, EmailTemplateId, EmailTemplateVars } from '@shared/email/types';

export type { EmailLocale, EmailTemplateId, EmailTemplateVars };
export { renderEmailTemplate, getNotificationMessage } from '@shared/email/render';
export { sendTransactionalEmail } from '@shared/email/send';
export { normalizeEmailLocale } from '@shared/email/locale';

export async function sendTemplateEmail(params: {
  to: string;
  templateId: EmailTemplateId;
  locale?: string | null;
  vars?: EmailTemplateVars;
  idempotencyKey?: string;
}): Promise<void> {
  const locale = normalizeEmailLocale(params.locale);
  await sendTransactionalEmail({
    to: params.to,
    templateId: params.templateId,
    locale,
    vars: params.vars,
    idempotencyKey: params.idempotencyKey,
  });
}

export async function notifyUserEmailAndInApp(params: {
  supabase: SupabaseClient;
  userId: string;
  email: string | null | undefined;
  templateId: EmailTemplateId;
  locale?: string | null;
  vars?: EmailTemplateVars;
  idempotencyKey?: string;
  notificationMessage?: string;
}): Promise<void> {
  const locale = normalizeEmailLocale(params.locale);
  const message =
    params.notificationMessage ??
    getNotificationMessage(params.templateId, locale, params.vars);

  await params.supabase.from('user_notifications').insert({
    user_id: params.userId,
    message,
  });

  if (params.email) {
    await sendTemplateEmail({
      to: params.email,
      templateId: params.templateId,
      locale,
      vars: params.vars,
      idempotencyKey: params.idempotencyKey,
    });
  }
}

export async function sendAccountSuspendedEmail(to: string, locale?: string | null): Promise<void> {
  await sendTemplateEmail({ to, templateId: 'account_suspended', locale, idempotencyKey: `account-suspended/${to}` });
}

export async function sendAccountReinstatedEmail(to: string, locale?: string | null): Promise<void> {
  await sendTemplateEmail({ to, templateId: 'account_reinstated', locale, idempotencyKey: `account-reinstated/${to}` });
}

export async function sendAccountDeletedEmail(to: string, locale?: string | null): Promise<void> {
  await sendTemplateEmail({ to, templateId: 'account_deleted', locale, idempotencyKey: `account-deleted/${to}` });
}

export async function sendWelcomeEmail(to: string, locale?: string | null, userId?: string): Promise<void> {
  await sendTemplateEmail({
    to,
    templateId: 'welcome',
    locale,
    idempotencyKey: userId ? `welcome/${userId}` : `welcome/${to}`,
  });
}
