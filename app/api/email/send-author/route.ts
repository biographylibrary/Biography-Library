import { NextRequest, NextResponse } from 'next/server';
import { getCallerStaffContext } from '@/lib/server/admin-api-auth';
import {
  sendTemplateEmail,
  normalizeEmailLocale,
  type EmailTemplateId,
} from '@/lib/server/email';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

const ALLOWED_TEMPLATES = new Set<EmailTemplateId>([
  'admin_bio_force_published',
  'admin_bio_set_draft',
  'admin_bio_removed',
  'admin_bio_restored',
  'admin_bio_frozen',
  'admin_bio_unfrozen',
  'publication_published',
  'publication_published_warning',
  'publication_returned',
  'publication_removed',
]);

export async function POST(req: NextRequest) {
  const ctx = await getCallerStaffContext(req);
  if (!ctx || !['reviewer', 'admin', 'super_admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    userId?: string;
    email?: string;
    templateId?: EmailTemplateId;
    locale?: string;
    vars?: Record<string, string>;
    notificationMessage?: string;
    biographyId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, email, templateId, locale, vars, biographyId } = body;
  if (!userId || !templateId || !ALLOWED_TEMPLATES.has(templateId)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const service = buildServiceClient();
  let resolvedEmail = email ?? null;
  let resolvedLocale = locale ?? null;

  if (!resolvedEmail || !resolvedLocale) {
    const { data: profile } = await service
      .from('profiles')
      .select('email, language')
      .eq('id', userId)
      .maybeSingle();
    resolvedEmail = resolvedEmail ?? (profile as { email?: string } | null)?.email ?? null;
    resolvedLocale = resolvedLocale ?? (profile as { language?: string } | null)?.language ?? 'en';
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const editorUrl = biographyId && siteUrl ? `${siteUrl.replace(/\/$/, '')}/biography/${biographyId}/edit` : undefined;

  let biographyTitle = vars?.biographyTitle ?? '';
  if (biographyId && !biographyTitle) {
    const { data: bio } = await service
      .from('biographies')
      .select('title')
      .eq('id', biographyId)
      .maybeSingle();
    biographyTitle = (bio as { title?: string } | null)?.title ?? '';
  }

  try {
    if (resolvedEmail) {
      await sendTemplateEmail({
        to: resolvedEmail,
        templateId,
        locale: normalizeEmailLocale(resolvedLocale),
        vars: { ...vars, biographyTitle, editorUrl },
        idempotencyKey: `${templateId}/${userId}/${biographyId ?? 'na'}/${Date.now()}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/send-author]', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
