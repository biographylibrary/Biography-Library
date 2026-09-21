'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { BetaLocalSaveBanner } from '@/components/waitlist/BetaLocalSaveBanner';
import { useTranslation } from '@/lib/i18n/i18n-context';

export function WaitlistLanding() {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center mb-4">
              <Logo height={64} />
            </div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">
              {t.waitlist.landingTitle}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.waitlist.landingLead}</p>
            <p className="text-sm text-muted-foreground">{t.waitlist.landingBeta}</p>
          </div>
          <BetaLocalSaveBanner />
          <RegisterForm embedded />
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
              {t.waitlist.alreadyHaveAccess}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
