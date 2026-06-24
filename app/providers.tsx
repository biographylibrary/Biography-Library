'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { MetaTags } from '@/components/meta-tags';
import { OnboardingGateProvider } from '@/components/onboarding/OnboardingGateProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <I18nProvider>
          <OnboardingGateProvider>
            <MetaTags />
            {children}
          </OnboardingGateProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
