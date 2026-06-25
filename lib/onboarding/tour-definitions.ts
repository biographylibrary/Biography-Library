import type { WritingPath } from './types';
import {
  isMobileEditorLayout,
  MOBILE_SIDEBAR_TOGGLE_SELECTOR,
} from './tour-mobile';

export type TourRequiredAction =
  | 'none'
  | 'click_target'
  | 'editor_input'
  | 'open_import'
  | 'open_export'
  | 'open_echo'
  | 'open_review';

export interface TourStepDefinition {
  id: string;
  target: string;
  titleKey: keyof import('@/lib/i18n/translations').Translations['onboardingTour'];
  descKey: keyof import('@/lib/i18n/translations').Translations['onboardingTour'];
  requiredAction: TourRequiredAction;
  actionTarget?: string;
}

const MOBILE_MENU_STEP: TourStepDefinition = {
  id: 'mobile-menu',
  target: MOBILE_SIDEBAR_TOGGLE_SELECTOR,
  titleKey: 'mobileMenuTitle',
  descKey: 'mobileMenuDesc',
  requiredAction: 'click_target',
  actionTarget: MOBILE_SIDEBAR_TOGGLE_SELECTOR,
};

export function getTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow',
  options?: { mobileLayout?: boolean }
): TourStepDefinition[] {
  const mobileLayout = options?.mobileLayout ?? isMobileEditorLayout();
  const base = getBaseTourSteps(path, mode);
  if (!mobileLayout) return base;
  return [MOBILE_MENU_STEP, ...base];
}

function getBaseTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow'
): TourStepDefinition[] {
  if (path === 'sections' || (path === 'freeflow_import' && mode === 'sections')) {
    return [
      {
        id: 'sections-overview',
        target: '[data-tour-id="section-list"]',
        titleKey: 'sectionsOverviewTitle',
        descKey: 'sectionsOverviewDesc',
        requiredAction: 'none',
      },
      {
        id: 'sections-editor',
        target: '[data-tour-id="editor-main"]',
        titleKey: 'sectionsEditorTitle',
        descKey: 'sectionsEditorDesc',
        requiredAction: 'editor_input',
        actionTarget: '[data-tour-id="editor-main"]',
      },
      {
        id: 'echo-panel',
        target: '[data-tour-id="echo-panel"]',
        titleKey: 'echoPanelTitle',
        descKey: 'echoPanelDesc',
        requiredAction: 'open_echo',
        actionTarget: '[data-tour-id="echo-input"]',
      },
      {
        id: 'book-structure',
        target: '[data-tour-id="book-structure-btn"]',
        titleKey: 'bookStructureTitle',
        descKey: 'bookStructureDesc',
        requiredAction: 'click_target',
        actionTarget: '[data-tour-id="book-structure-btn"]',
      },
      {
        id: 'review-publication',
        target: '[data-tour-id="review-publication-btn"]',
        titleKey: 'reviewPublicationTitle',
        descKey: 'reviewPublicationDesc',
        requiredAction: 'open_review',
        actionTarget: '[data-tour-id="review-publication-btn"]',
      },
    ];
  }

  if (path === 'freeflow_import') {
    return [
      {
        id: 'import-overview',
        target: '[data-tour-id="editor-main"]',
        titleKey: 'importOverviewTitle',
        descKey: 'importOverviewDesc',
        requiredAction: 'none',
      },
      {
        id: 'import-try',
        target: '[data-tour-id="import-btn"]',
        titleKey: 'importTryTitle',
        descKey: 'importTryDesc',
        requiredAction: 'open_import',
        actionTarget: '[data-tour-id="import-btn"]',
      },
      {
        id: 'review-publication',
        target: '[data-tour-id="review-publication-btn"]',
        titleKey: 'reviewPublicationTitle',
        descKey: 'reviewPublicationDesc',
        requiredAction: 'open_review',
        actionTarget: '[data-tour-id="review-publication-btn"]',
      },
    ];
  }

  // publish_ready
  return [
    {
      id: 'publish-import',
      target: '[data-tour-id="import-btn"]',
      titleKey: 'publishImportTitle',
      descKey: 'publishImportDesc',
      requiredAction: 'open_import',
      actionTarget: '[data-tour-id="import-btn"]',
    },
    {
      id: 'publish-final',
      target: '[data-tour-id="editor-main"]',
      titleKey: 'publishFinalTitle',
      descKey: 'publishFinalDesc',
      requiredAction: 'none',
    },
    {
      id: 'publish-export',
      target: '[data-tour-id="review-publication-btn"]',
      titleKey: 'reviewPublicationTitle',
      descKey: 'reviewPublicationDesc',
      requiredAction: 'open_review',
      actionTarget: '[data-tour-id="review-publication-btn"]',
    },
  ];
}
