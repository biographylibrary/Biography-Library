import type { Language } from './translations';

const SUPPORTED: Language[] = ['en', 'it', 'fr', 'de'];

export function getBrowserLanguageTag(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language || 'en';
}

export function mapBrowserTagToAppLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split('-')[0];
  if (base === 'en' || base === 'it' || base === 'fr' || base === 'de') {
    return base;
  }
  return null;
}

export function isBrowserEnglish(tag: string): boolean {
  return tag.toLowerCase().startsWith('en');
}

export function popupDisplayLanguage(browserTag: string): Language {
  return mapBrowserTagToAppLanguage(browserTag) ?? 'en';
}

export function shouldShowLanguageGate(
  languageConfirmed: boolean,
  browserTag: string
): boolean {
  if (languageConfirmed) return false;
  return !isBrowserEnglish(browserTag);
}

export function isSupportedLanguage(value: string): value is Language {
  return SUPPORTED.includes(value as Language);
}
