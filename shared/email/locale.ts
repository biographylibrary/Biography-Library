import type { EmailLocale } from './types';
import { EMAIL_LOCALES } from './types';

export function normalizeEmailLocale(value: string | null | undefined): EmailLocale {
  const code = (value ?? 'en').slice(0, 2).toLowerCase();
  if (EMAIL_LOCALES.includes(code as EmailLocale)) {
    return code as EmailLocale;
  }
  return 'en';
}

/** User-facing emails: profile preference, then signup language, then English. */
export function resolveUserEmailLocale(input: {
  profileLanguage?: string | null;
  signupLanguage?: string | null;
}): EmailLocale {
  return normalizeEmailLocale(input.profileLanguage ?? input.signupLanguage ?? 'en');
}

export function resolveSiteUrl(base?: string | null): string {
  const raw = (base ?? '').replace(/\/$/, '');
  return raw || 'https://app.biographylibrary.org';
}

export function resolveSiteName(name?: string | null): string {
  return name?.trim() || 'Biography Library';
}
