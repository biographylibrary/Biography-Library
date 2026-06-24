'use client';

import { WIZARD_STEP_ORDER, type WizardStep } from '@/lib/onboarding/types';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: WizardStep;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const { t } = useTranslation();
  const currentIndex = WIZARD_STEP_ORDER.indexOf(currentStep);

  return (
    <div className="w-full space-y-2">
      <p className="text-xs text-muted-foreground font-medium">
        {t.onboardingWizard.stepProgress
          .replace('{current}', String(currentIndex + 1))
          .replace('{total}', String(WIZARD_STEP_ORDER.length))}
      </p>
      <div className="flex gap-2">
        {WIZARD_STEP_ORDER.map((step, idx) => (
          <div
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              idx <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}
