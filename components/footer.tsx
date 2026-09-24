'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { formatUmYear, umYearFromDate } from '@/lib/um';

export function Footer() {
  const { t } = useTranslation();

  const umLabel = `${t.umId.yearWord} ${formatUmYear(umYearFromDate(new Date()), 'short')}`;

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
            <span className="text-xs text-muted-foreground">· {umLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
              {t.footer.termsOfService}
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <span>•</span>
            <Link href="/cookie-policy" className="hover:text-foreground transition-colors">
              {t.footer.cookiePolicy}
            </Link>
            <span>•</span>
            <Link href="/credits" className="hover:text-foreground transition-colors">
              {t.footer.credits}
            </Link>
            <span>•</span>
            <Link href="/um-identifier" className="hover:text-foreground transition-colors">
              {t.footer.umIdentifier}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
