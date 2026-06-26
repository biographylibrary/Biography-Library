'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/onboarding/onboarding-tour.css';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getTourSteps, type TourStepDefinition } from '@/lib/onboarding/tour-definitions';
import type { WritingPath } from '@/lib/onboarding/types';
import { patchOnboarding } from '@/lib/onboarding/onboarding-client';
import {
  isMobileEditorLayout,
  isSidebarTourTarget,
  waitForTransition,
} from '@/lib/onboarding/tour-mobile';

interface OnboardingTourProviderProps {
  active: boolean;
  writingPath: WritingPath;
  biographyMode: 'sections' | 'freeflow';
  onOpenMobileSidebar?: () => void;
  onCloseMobileSidebar?: () => void;
  onFinished: () => void;
}

function getPopoverSide(target: string): 'top' | 'bottom' | 'left' | 'right' {
  if (!isMobileEditorLayout()) {
    if (isSidebarTourTarget(target)) return 'right';
    if (target.includes('book-title') || target.includes('privacy-btn')) return 'bottom';
    return 'bottom';
  }
  if (target.includes('mobile-sidebar-toggle')) return 'top';
  if (isSidebarTourTarget(target)) return 'right';
  if (target.includes('book-title') || target.includes('privacy-btn')) return 'bottom';
  return 'bottom';
}

export function OnboardingTourProvider({
  active,
  writingPath,
  biographyMode,
  onOpenMobileSidebar,
  onCloseMobileSidebar,
  onFinished,
}: OnboardingTourProviderProps) {
  const { t, language } = useTranslation();
  const driverRef = useRef<Driver | null>(null);
  const stepIndexRef = useRef(0);
  const stepsRef = useRef<TourStepDefinition[]>([]);
  const startedRef = useRef(false);

  const onOpenMobileSidebarRef = useRef(onOpenMobileSidebar);
  const onCloseMobileSidebarRef = useRef(onCloseMobileSidebar);
  const onFinishedRef = useRef(onFinished);
  const tRef = useRef(t);

  onOpenMobileSidebarRef.current = onOpenMobileSidebar;
  onCloseMobileSidebarRef.current = onCloseMobileSidebar;
  onFinishedRef.current = onFinished;
  tRef.current = t;

  const finishTour = useCallback(async () => {
    onCloseMobileSidebarRef.current?.();
    driverRef.current?.destroy();
    driverRef.current = null;
    startedRef.current = false;
    await patchOnboarding({ action: 'complete_tour' });
    onFinishedRef.current();
  }, []);

  const exitTourEarly = useCallback(async () => {
    onCloseMobileSidebarRef.current?.();
    driverRef.current?.destroy();
    driverRef.current = null;
    startedRef.current = false;
    await patchOnboarding({ action: 'skip' });
    onFinishedRef.current();
  }, []);

  const prepareStepEnvironment = useCallback(async (step: TourStepDefinition) => {
    if (!isMobileEditorLayout()) return;

    if (step.id === 'mobile-menu') {
      onCloseMobileSidebarRef.current?.();
      await waitForTransition();
      return;
    }

    if (isSidebarTourTarget(step.target)) {
      onOpenMobileSidebarRef.current?.();
      await waitForTransition();
      document.querySelector<HTMLElement>(step.target)?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
      return;
    }

    onCloseMobileSidebarRef.current?.();
    await waitForTransition(200);
  }, []);

  const goToStep = useCallback(
    async (index: number, d: Driver) => {
      if (index >= stepsRef.current.length) {
        void finishTour();
        return;
      }

      const step = stepsRef.current[index];
      await prepareStepEnvironment(step);
      stepIndexRef.current = index;
      d.moveTo(index);
    },
    [finishTour, prepareStepEnvironment],
  );

  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;

    const steps = getTourSteps(writingPath, biographyMode, {
      mobileLayout: isMobileEditorLayout(),
    });
    stepsRef.current = steps;
    stepIndexRef.current = 0;
    startedRef.current = true;

    const tw = tRef.current.onboardingWizard;
    const tt = tRef.current.onboardingTour;

    const driveSteps: DriveStep[] = steps.map((step) => {
      let description = tt[step.descKey];
      if (
        isMobileEditorLayout() &&
        step.target === '[data-tour-id="section-list"]'
      ) {
        description = `${description}\n\n${tt.mobileSidebarOverviewHint}`;
      }

      return {
        element: step.target,
        popover: {
          title: tt[step.titleKey],
          description,
          side: getPopoverSide(step.target),
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
            void goToStep(nextIdx, d);
          },
          onPrevClick: (_el, _step, { driver: d }) => {
            void goToStep(Math.max(0, stepIndexRef.current - 1), d);
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
      onHighlightStarted: async (_element, _step, { driver: drv }) => {
        const idx = drv.getActiveIndex() ?? 0;
        const def = steps[idx];
        if (def) {
          await prepareStepEnvironment(def);
        }
      },
      onDestroyed: () => {
        driverRef.current = null;
        startedRef.current = false;
        onCloseMobileSidebarRef.current?.();
      },
    });

    driverRef.current = d;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (steps[0]) await prepareStepEnvironment(steps[0]);
        d.drive();
      })();
    }, 700);

    return () => {
      window.clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      startedRef.current = false;
      onCloseMobileSidebarRef.current?.();
    };
  }, [
    active,
    biographyMode,
    writingPath,
    language,
    finishTour,
    exitTourEarly,
    goToStep,
    prepareStepEnvironment,
  ]);

  return null;
}
