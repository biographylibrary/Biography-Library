'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';

export function BetaLocalSaveBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={
        compact
          ? 'shrink-0 border-b border-brand-mustardDark/35 bg-[#DDCF88]/35 px-4 py-2 dark:bg-[#DDCF88]/10 dark:border-brand-mustardDark/40'
          : 'rounded-lg border border-brand-mustardDark/40 bg-[#DDCF88]/30 px-4 py-3 text-sm text-brand-ink dark:bg-[#DDCF88]/10 dark:text-brand-beigeLight dark:border-brand-mustardDark/35'
      }
    >
      <p className={compact ? 'text-xs text-brand-ink dark:text-brand-beigeLight' : 'font-medium'}>
        {t.waitlist.betaBanner}
      </p>
      <p className={compact ? 'text-xs text-brand-ink/80 dark:text-brand-beigeLight/80 mt-0.5' : 'mt-1 text-sm opacity-90'}>
        {t.waitlist.localSaveBanner} {t.waitlist.exportHint}
      </p>
    </div>
  );
}
