import type { EmailLocale } from './types';
import { EMAIL_LOCALES } from './types';

export function normalizeEmailLocale(value: string | null | undefined): EmailLocale {
  const code = (value ?? 'en').slice(0, 2).toLowerCase();
  if (EMAIL_LOCALES.includes(code as EmailLocale)) {
    return code as EmailLocale;
  }
  return 'en';
}

export function resolveSiteUrl(base?: string | null): string {
  const raw = (base ?? '').replace(/\/$/, '');
  return raw || 'https://app.biographylibrary.org';
}

export function resolveSiteName(name?: string | null): string {
  return name?.trim() || 'Biography Library';
}
