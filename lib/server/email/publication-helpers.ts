import type { SupabaseClient } from '@supabase/supabase-js';
import {
  notifyUserEmailAndInApp,
  sendTemplateEmail,
  normalizeEmailLocale,
  type EmailTemplateId,
} from '@/lib/server/email';

type AnyClient = SupabaseClient<any, any, any>;

export async function fetchProfileEmailContext(
  client: AnyClient,
  userId: string,
): Promise<{ email: string | null; locale: string }> {
  const { data } = await client
    .from('profiles')
    .select('email, language')
    .eq('id', userId)
    .maybeSingle();
  return {
    email: (data as { email?: string | null } | null)?.email ?? null,
    locale: (data as { language?: string | null } | null)?.language ?? 'en',
  };
}

export async function fetchBiographyTitle(client: AnyClient, biographyId: string): Promise<string> {
  const { data } = await client
    .from('biographies')
    .select('title')
    .eq('id', biographyId)
    .maybeSingle();
  return (data as { title?: string } | null)?.title ?? '';
}

function editorUrl(biographyId: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/biography/${biographyId}/edit`;
}

export async function notifyAuthorPublicationEmail(params: {
  client: AnyClient;
  authorId: string;
  biographyId: string;
  templateId: EmailTemplateId;
  contentLanguage?: string;
  vars?: Record<string, string>;
  notificationMessage: string;
}): Promise<void> {
  const author = await fetchProfileEmailContext(params.client, params.authorId);
  const title = await fetchBiographyTitle(params.client, params.biographyId);
  const locale = normalizeEmailLocale(author.locale ?? params.contentLanguage);

  await notifyUserEmailAndInApp({
    supabase: params.client,
    userId: params.authorId,
    email: author.email,
    templateId: params.templateId,
    locale,
    vars: {
      biographyTitle: title,
      editorUrl: editorUrl(params.biographyId),
      ...params.vars,
    },
    idempotencyKey: `${params.templateId}/${params.authorId}/${params.biographyId}`,
    notificationMessage: params.notificationMessage,
  });
}

export async function notifyReviewerAssignedEmail(params: {
  client: AnyClient;
  reviewerId: string;
  biographyId: string;
  contentLanguage?: string;
  notificationMessage: string;
}): Promise<void> {
  const reviewer = await fetchProfileEmailContext(params.client, params.reviewerId);
  const title = await fetchBiographyTitle(params.client, params.biographyId);
  const locale = normalizeEmailLocale(reviewer.locale ?? params.contentLanguage);

  await params.client.from('user_notifications').insert({
    user_id: params.reviewerId,
    message: params.notificationMessage,
  });

  if (reviewer.email) {
    await sendTemplateEmail({
      to: reviewer.email,
      templateId: 'reviewer_assigned',
      locale,
      vars: { biographyTitle: title },
      idempotencyKey: `reviewer-assigned/${params.reviewerId}/${params.biographyId}`,
    });
  }
}
