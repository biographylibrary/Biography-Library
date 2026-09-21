'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';
import { formatUmYear, umYearFromDate } from '@/lib/um';
import Link from 'next/link';

const ASSOCIATION_EMAIL = 'support@biographylibrary.org';
const ASSOCIATION_WEBSITE = 'https://biographylibrary.org';
const ASSOCIATION_GITHUB = 'https://github.com/BiographyLibrary/Biography-Library';
const SOFTWARE_LICENSE = 'AGPL-3.0';

function CreditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-4 py-2 border-b border-border/40 last:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

export default function CreditsPage() {
  const { t } = useTranslation();
  const c = t.creditsPage;
  const um = formatUmYear(umYearFromDate(new Date()), 'short');

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif font-semibold tracking-tight">{t.footer.credits}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{c.orgHeading}</p>
      </header>

      <dl>
        <CreditRow label={c.nameLabel}>{c.legalName}</CreditRow>
        <CreditRow label={c.legalFormLabel}>{c.legalForm}</CreditRow>
        <CreditRow label={c.seatLabel}>{c.seat}</CreditRow>
        <CreditRow label={c.presidentLabel}>{c.president}</CreditRow>
        <CreditRow label={c.emailLabel}>
          <a className="text-primary hover:underline" href={`mailto:${ASSOCIATION_EMAIL}`}>
            {ASSOCIATION_EMAIL}
          </a>
        </CreditRow>
        <CreditRow label={c.websiteLabel}>
          <a
            className="text-primary hover:underline"
            href={ASSOCIATION_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
          >
            biographylibrary.org
          </a>
        </CreditRow>
        <CreditRow label={c.codeLabel}>
          <a
            className="text-primary hover:underline"
            href={ASSOCIATION_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/BiographyLibrary/Biography-Library
          </a>
        </CreditRow>
        <CreditRow label={c.licenseLabel}>{SOFTWARE_LICENSE}</CreditRow>
        <CreditRow label={c.lawLabel}>{c.law}</CreditRow>
        <CreditRow label={c.courtsLabel}>{c.courts}</CreditRow>
      </dl>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-semibold tracking-tight">{c.umHeading}</h2>
        <p className="text-base leading-relaxed">{t.umId.creditsLead}</p>
        <p className="text-base leading-relaxed">
          {t.umId.yearWord} {um}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.umId.creditsBody}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.umId.metadataCc0}</p>
      </section>

      <p className="text-sm">
        <Link href="/" className="text-primary hover:underline">
          Biography Library
        </Link>
      </p>
    </main>
  );
}
