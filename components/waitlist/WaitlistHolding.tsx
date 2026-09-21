'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader as Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { BetaLocalSaveBanner } from '@/components/waitlist/BetaLocalSaveBanner';
import { postLoginPath } from '@/lib/waitlist';

function formatRegisteredOn(iso: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function WaitlistHolding() {
  const { user, loading, profileReady, accountStatus, role, signOut } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (accountStatus !== 'waitlist') {
      router.replace(postLoginPath({ accountStatus, role }));
    }
  }, [loading, profileReady, user, accountStatus, role, router]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from('profiles')
      .select('created_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const iso = (data as { created_at?: string } | null)?.created_at;
        if (iso) setRegisteredAt(iso);
      });
  }, [user]);

  if (loading || !profileReady || !user || accountStatus !== 'waitlist') {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dateLabel = registeredAt
    ? t.waitlist.registeredOn.replace('{date}', formatRegisteredOn(registeredAt, language))
    : null;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center">
            <Logo height={64} />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-serif font-semibold tracking-tight">
              {t.waitlist.holdingTitle}
            </h1>
            {dateLabel && <p className="text-base text-foreground">{dateLabel}</p>}
            <p className="text-sm text-muted-foreground leading-relaxed">{t.waitlist.holdingLead}</p>
            <p className="text-sm text-muted-foreground">{t.waitlist.holdingBeta}</p>
          </div>
          <BetaLocalSaveBanner />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void signOut({ redirectToLogin: true })}
          >
            {t.common.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
}
