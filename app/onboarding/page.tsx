'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useOnboardingGate } from '@/components/onboarding/OnboardingGateProvider';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';
import { fetchBiographies } from '@/lib/biographies';
import { Loader as Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { languageGateResolved, onboardingState, refreshOnboarding } = useOnboardingGate();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnTo=/onboarding');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!onboardingState) return;
    if (onboardingState.onboarding_phase === 'completed') {
      router.replace('/dashboard');
      return;
    }
    if (onboardingState.onboarding_phase === 'tour') {
      if (!user) return;
      void fetchBiographies(user.id).then(({ data }) => {
        const bio = data?.[0];
        if (bio) {
          router.replace(`/biography/${bio.id}/edit?tour=1`);
        }
      });
      return;
    }
    if (onboardingState.onboarding_phase === 'skipped') {
      void patchOnboarding({ action: 'resume' }).then(() => refreshOnboarding());
    }
  }, [onboardingState, router, refreshOnboarding, user]);

  if (authLoading || !languageGateResolved || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDEBE7]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (
    onboardingState?.onboarding_phase === 'completed' ||
    onboardingState?.onboarding_phase === 'tour'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDEBE7]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEBE7] dark:bg-[#1F2121] px-4 py-6 sm:py-10 md:py-14">
      <div className="w-full max-w-3xl mx-auto rounded-xl border border-border/60 bg-card shadow-sm p-4 sm:p-6 md:p-10">
        <OnboardingWizard />
      </div>
    </div>
  );
}
