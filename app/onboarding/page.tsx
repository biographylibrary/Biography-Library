'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import { Loader as Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { languageGateResolved, onboardingState } = useOnboardingGate();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnTo=/onboarding');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!onboardingState) return;
    if (onboardingState.onboarding_phase === 'completed') {
      router.replace('/echo');
    }
    if (onboardingState.onboarding_phase === 'skipped') {
      router.replace('/echo');
    }
    if (onboardingState.onboarding_phase === 'tour') {
      router.replace('/dashboard');
    }
  }, [onboardingState, router]);

  if (authLoading || !languageGateResolved || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDEBE7]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEBE7] dark:bg-[#1F2121] px-4 py-10 md:py-14">
      <div className="w-full max-w-3xl mx-auto rounded-xl border border-border/60 bg-card shadow-sm p-6 md:p-10">
        <OnboardingWizard />
      </div>
    </div>
  );
}
