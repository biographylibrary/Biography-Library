import { describe, expect, it } from 'vitest';
import { renderEmailTemplate } from '@shared/email/render';
import { EMAIL_LOCALES, type EmailTemplateId } from '@shared/email/types';

const CORE_TEMPLATES: EmailTemplateId[] = [
  'auth_confirm_signup',
  'auth_reset_password',
  'welcome',
  'account_suspended',
  'publication_auto_published',
  'publication_under_review',
  'engagement_chapter_available',
  'engagement_pdf_draft_reminder',
];

describe('email copy', () => {
  it('renders all core templates in every locale', () => {
    for (const templateId of CORE_TEMPLATES) {
      for (const locale of EMAIL_LOCALES) {
        const rendered = renderEmailTemplate({
          templateId,
          locale,
          vars: {
            confirmUrl: 'https://example.com/confirm',
            biographyTitle: 'Test Bio',
            draftIteration: '2',
            availableDate: '2026-06-19',
          },
        });
        expect(rendered.subject.length).toBeGreaterThan(5);
        expect(rendered.html).toContain('<!DOCTYPE html>');
        expect(rendered.html).toContain('Biography Library');
      }
    }
  });

  it('includes confirm link for signup auth email', () => {
    const rendered = renderEmailTemplate({
      templateId: 'auth_confirm_signup',
      locale: 'en',
      vars: { confirmUrl: 'https://example.com/verify' },
    });
    expect(rendered.html).toContain('https://example.com/verify');
  });

  it('uses black text for headings and links (no brand green)', () => {
    const rendered = renderEmailTemplate({
      templateId: 'welcome',
      locale: 'en',
    });
    expect(rendered.html).not.toContain('#2d5016');
    expect(rendered.html).toContain('color:#121212');
  });

  it('includes left-aligned logo in all emails', () => {
    const rendered = renderEmailTemplate({
      templateId: 'auth_confirm_signup',
      locale: 'it',
      vars: { confirmUrl: 'https://example.com/confirm' },
    });
    expect(rendered.html).toContain('logo-email.png');
    expect(rendered.html).toContain('text-align:left');
    expect(rendered.html).toContain('alt="Biography Library"');
  });

  it('welcome email links to workspace with updated Italian copy', () => {
    const rendered = renderEmailTemplate({
      templateId: 'welcome',
      locale: 'it',
      siteUrl: 'https://app.biographylibrary.org',
    });
    expect(rendered.html).toContain('https://app.biographylibrary.org/workspace');
    expect(rendered.html).toContain('Vai al workspace');
    expect(rendered.html).toContain('la tua storia o quella di un familiare');
    expect(rendered.html).toContain('controllo con AI e umani');
  });
});
