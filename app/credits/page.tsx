'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';
import { formatUmYear, umYearFromDate } from '@/lib/um';
import Link from 'next/link';

export default function CreditsPage() {
  const { t } = useTranslation();
  const um = formatUmYear(umYearFromDate(new Date()), 'short');

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-6">
      <h1 className="text-3xl font-serif font-semibold tracking-tight">{t.umId.creditsTitle}</h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        {t.umId.creditsLead}
      </p>
      <p className="text-base leading-relaxed">
        {t.umId.yearWord} {um}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{t.umId.creditsBody}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{t.umId.metadataCc0}</p>
      <p className="text-sm">
        <Link href="/" className="text-primary hover:underline">
          Biography Library
        </Link>
      </p>
    </main>
  );
}
