import { resolveSiteName, resolveSiteUrl } from './locale';
import { renderEmailTemplate } from './render';
import type {
  EmailLocale,
  EmailTemplateId,
  EmailTemplateVars,
  RenderedEmail,
  ResendEnv,
} from './types';

export type SendEmailParams = {
  to: string;
  templateId: EmailTemplateId;
  locale: EmailLocale;
  vars?: EmailTemplateVars;
  idempotencyKey?: string;
  env?: ResendEnv;
};

export type SendEmailResult =
  | { sent: true; id?: string }
  | { sent: false; skipped: true }
  | { sent: false; error: string };

function resolveEnv(override?: ResendEnv): ResendEnv {
  if (override) return override;
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME,
    siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  };
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const env = resolveEnv(params.env);
  const apiKey = env.apiKey?.trim();
  const from = env.from?.trim();

  if (!apiKey || !from) {
    console.warn('[email] skip: RESEND_API_KEY or RESEND_FROM_EMAIL missing', {
      templateId: params.templateId,
    });
    return { sent: false, skipped: true };
  }

  const rendered: RenderedEmail = renderEmailTemplate({
    templateId: params.templateId,
    locale: params.locale,
    vars: params.vars,
    siteName: resolveSiteName(env.siteName),
    siteUrl: resolveSiteUrl(env.siteUrl),
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: rendered.subject,
      html: rendered.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const message = `Resend API ${res.status}: ${text.slice(0, 200)}`;
    console.error('[email] send failed', { templateId: params.templateId, message });
    throw new Error(message);
  }

  let id: string | undefined;
  try {
    const json = (await res.json()) as { id?: string };
    id = json.id;
  } catch {
    /* ignore */
  }

  console.info('[email] sent', { templateId: params.templateId, locale: params.locale });
  return { sent: true, id };
}

export { renderEmailTemplate, getNotificationMessage } from './render';
