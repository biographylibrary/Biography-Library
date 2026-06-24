export type EmailLocale = 'en' | 'it' | 'fr' | 'de';

export const EMAIL_LOCALES: EmailLocale[] = ['en', 'it', 'fr', 'de'];

export type EmailTemplateId =
  | 'auth_confirm_signup'
  | 'auth_reset_password'
  | 'auth_email_change'
  | 'welcome'
  | 'account_suspended'
  | 'account_reinstated'
  | 'account_deleted'
  | 'publication_under_review'
  | 'publication_auto_published'
  | 'publication_published'
  | 'publication_published_warning'
  | 'publication_returned'
  | 'publication_removed'
  | 'reviewer_assigned'
  | 'admin_bio_force_published'
  | 'admin_bio_set_draft'
  | 'admin_bio_removed'
  | 'admin_bio_restored'
  | 'admin_bio_frozen'
  | 'admin_bio_unfrozen'
  | 'engagement_chapter_available'
  | 'engagement_pdf_draft_reminder';

export type EmailTemplateVars = Record<string, string | number | undefined>;

export type RenderedEmail = {
  subject: string;
  html: string;
};

export type ResendEnv = {
  apiKey: string | null | undefined;
  from: string | null | undefined;
  siteName?: string;
  siteUrl?: string;
};
