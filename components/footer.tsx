'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 bg-background/80 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t.footer.hostedInSwitzerland}
          </p>
        </div>
      </div>
    </footer>
  );
}
