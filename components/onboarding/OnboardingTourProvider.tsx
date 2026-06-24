'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/onboarding/onboarding-tour.css';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getTourSteps, type TourStepDefinition } from '@/lib/onboarding/tour-definitions';
import type { WritingPath } from '@/lib/onboarding/types';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';

interface OnboardingTourProviderProps {
  active: boolean;
  writingPath: WritingPath;
  biographyMode: 'sections' | 'freeflow';
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenEcho: () => void;
  onOpenReview: () => void;
  onFinished: () => void;
}

export function OnboardingTourProvider({
  active,
  writingPath,
  biographyMode,
  onOpenImport,
  onOpenExport,
  onOpenEcho,
  onOpenReview,
  onFinished,
}: OnboardingTourProviderProps) {
  const { t, language } = useTranslation();
  const driverRef = useRef<Driver | null>(null);
  const stepIndexRef = useRef(0);
  const stepsRef = useRef<TourStepDefinition[]>([]);
  const startedRef = useRef(false);

  const onOpenImportRef = useRef(onOpenImport);
  const onOpenExportRef = useRef(onOpenExport);
  const onOpenEchoRef = useRef(onOpenEcho);
  const onOpenReviewRef = useRef(onOpenReview);
  const onFinishedRef = useRef(onFinished);
  const tRef = useRef(t);

  onOpenImportRef.current = onOpenImport;
  onOpenExportRef.current = onOpenExport;
  onOpenEchoRef.current = onOpenEcho;
  onOpenReviewRef.current = onOpenReview;
  onFinishedRef.current = onFinished;
  tRef.current = t;

  const finishTour = useCallback(async () => {
    driverRef.current?.destroy();
    driverRef.current = null;
    startedRef.current = false;
    await patchOnboarding({ action: 'complete_tour' });
    onFinishedRef.current();
  }, []);

  const exitTourEarly = useCallback(async () => {
    driverRef.current?.destroy();
    driverRef.current = null;
    startedRef.current = false;
    await patchOnboarding({ action: 'skip' });
    onFinishedRef.current();
  }, []);

  const runOptionalAction = useCallback((step: TourStepDefinition) => {
    if (step.requiredAction === 'open_import') onOpenImportRef.current();
    if (step.requiredAction === 'open_export') onOpenExportRef.current();
    if (step.requiredAction === 'open_echo') onOpenEchoRef.current();
    if (step.requiredAction === 'open_review') onOpenReviewRef.current();
    if (step.requiredAction === 'click_target' && step.actionTarget) {
      const el = document.querySelector<HTMLElement>(step.actionTarget);
      el?.click();
    }
  }, []);

  const attachTryButton = useCallback(
    (step: TourStepDefinition) => {
      if (step.requiredAction === 'none') return;

      const inject = () => {
        const popover = document.querySelector('.driver-popover');
        if (!popover) return;

        const footer = popover.querySelector('.driver-popover-footer');
        if (!footer || footer.querySelector('[data-onboarding-try]')) return;

        const tryBtn = document.createElement('button');
        tryBtn.type = 'button';
        tryBtn.dataset.onboardingTry = 'true';
        tryBtn.className = 'driver-popover-skip-step-btn';
        tryBtn.textContent = tRef.current.onboardingWizard.tourTryStep;
        tryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          runOptionalAction(step);
        });
        footer.prepend(tryBtn);
      };

      requestAnimationFrame(() => requestAnimationFrame(inject));
    },
    [runOptionalAction]
  );

  const goToStep = useCallback(
    (index: number, d: Driver) => {
      stepIndexRef.current = index;
      if (index >= stepsRef.current.length) {
        void finishTour();
        return;
      }
      d.moveTo(index);
    },
    [finishTour]
  );

  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;

    const steps = getTourSteps(writingPath, biographyMode);
    stepsRef.current = steps;
    stepIndexRef.current = 0;
    startedRef.current = true;

    const tw = tRef.current.onboardingWizard;
    const tt = tRef.current.onboardingTour;

    const driveSteps: DriveStep[] = steps.map((step) => {
      const optional =
        step.requiredAction !== 'none' ? `\n\n${tw.tourStepOptional}` : '';

      return {
        element: step.target,
        popover: {
          title: tt[step.titleKey],
          description: `${tt[step.descKey]}${optional}`,
          side: 'bottom',
          align: 'start',
          showButtons: ['previous', 'next', 'close'],
          nextBtnText: tw.tourNext,
          prevBtnText: tw.tourBack,
          doneBtnText: tw.tourFinish,
          onNextClick: (_el, _step, { driver: d }) => {
            const nextIdx = stepIndexRef.current + 1;
            if (nextIdx >= steps.length) {
              void finishTour();
              return;
            }
            goToStep(nextIdx, d);
          },
          onPrevClick: (_el, _step, { driver: d }) => {
            goToStep(Math.max(0, stepIndexRef.current - 1), d);
          },
          onCloseClick: () => {
            void exitTourEarly();
          },
        },
      };
    });

    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: false,
      overlayColor: 'rgba(18, 18, 18, 0.45)',
      stagePadding: 8,
      stageRadius: 12,
      steps: driveSteps,
      onHighlightStarted: (_element, _step, { driver: drv }) => {
        const idx = drv.getActiveIndex() ?? 0;
        stepIndexRef.current = idx;
        const def = steps[idx];
        if (def) attachTryButton(def);
      },
      onDestroyed: () => {
        driverRef.current = null;
        startedRef.current = false;
      },
    });

    driverRef.current = d;

    const timer = window.setTimeout(() => {
      d.drive();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      startedRef.current = false;
    };
  }, [
    active,
    attachTryButton,
    biographyMode,
    writingPath,
    language,
    finishTour,
    exitTourEarly,
    goToStep,
  ]);

  return null;
}
