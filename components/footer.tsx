'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';

const PRIVACY_LINKS: Record<string, string> = {
  en: 'https://biographylibrary.org/privacy-policy/',
  it: 'https://biographylibrary.org/it/informativa-sulla-privacy/',
  fr: 'https://biographylibrary.org/fr/politique-de-confidentialite/',
  de: 'https://biographylibrary.org/de/datenschutzerklarung/',
};

const TERMS_LINKS: Record<string, string> = {
  en: 'https://biographylibrary.org/terms-of-service/',
  it: 'https://biographylibrary.org/it/termini-di-servizio/',
  fr: 'https://biographylibrary.org/fr/conditions-dutilisation/',
  de: 'https://biographylibrary.org/fr/conditions-dutilisation/',
};

const COOKIE_LINKS: Record<string, string> = {
  en: 'https://biographylibrary.org/cookie-policy/',
  it: 'https://biographylibrary.org/it/informativa-sui-cookie/',
  fr: 'https://biographylibrary.org/fr/politique-des-cookies/',
  de: 'https://biographylibrary.org/de/cookie-richtlinie/',
};

export function Footer() {
  const { t, language } = useTranslation();

  const privacyHref = PRIVACY_LINKS[language] ?? PRIVACY_LINKS.en;
  const termsHref = TERMS_LINKS[language] ?? TERMS_LINKS.en;
  const cookieHref = COOKIE_LINKS[language] ?? COOKIE_LINKS.en;

  return (
    <footer className="border-t border-border/50 bg-[#ECE9E4] dark:bg-[#1F2121] mt-auto py-2 flex items-center">
      <div className="w-full px-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">
              {t.footer.hostedInSwitzerland}
            </p>
            <svg
              width="14"
              height="14"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <rect width="32" height="32" fill="#FF0000"/>
              <rect x="13" y="6" width="6" height="20" fill="white"/>
              <rect x="6" y="13" width="20" height="6" fill="white"/>
            </svg>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a
              href={termsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t.footer.termsOfService}
            </a>
            <span>•</span>
            <a
              href={privacyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t.footer.privacyPolicy}
            </a>
            <span>•</span>
            <a
              href={cookieHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t.footer.cookiePolicy}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
