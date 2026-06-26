import type { WritingPath } from './types';
import {
  isMobileEditorLayout,
  MOBILE_SIDEBAR_TOGGLE_SELECTOR,
} from './tour-mobile';

export interface TourStepDefinition {
  id: string;
  target: string;
  titleKey: keyof import('@/lib/i18n/translations').Translations['onboardingTour'];
  descKey: keyof import('@/lib/i18n/translations').Translations['onboardingTour'];
}

const MOBILE_MENU_STEP: TourStepDefinition = {
  id: 'mobile-menu',
  target: MOBILE_SIDEBAR_TOGGLE_SELECTOR,
  titleKey: 'mobileMenuTitle',
  descKey: 'mobileMenuDesc',
};

function step(
  id: string,
  target: string,
  titleKey: TourStepDefinition['titleKey'],
  descKey: TourStepDefinition['descKey'],
): TourStepDefinition {
  return { id, target, titleKey, descKey };
}

function getTopBarSteps(): TourStepDefinition[] {
  return [
    step('book-title', '[data-tour-id="book-title-btn"]', 'bookTitleTitle', 'bookTitleDesc'),
    step('privacy', '[data-tour-id="privacy-btn"]', 'privacyTitle', 'privacyDesc'),
  ];
}

function getSharedSidebarSteps(): TourStepDefinition[] {
  return [
    step('notes', '[data-tour-id="notes-btn"]', 'notesTitle', 'notesDesc'),
    step('photos', '[data-tour-id="photos-btn"]', 'photosTitle', 'photosDesc'),
    step(
      'book-structure',
      '[data-tour-id="book-structure-btn"]',
      'bookStructureTitle',
      'bookStructureDesc',
    ),
    step('import-text', '[data-tour-id="import-btn"]', 'importTextTitle', 'importTextDesc'),
    step('export-text', '[data-tour-id="export-pdf-btn"]', 'exportTextTitle', 'exportTextDesc'),
    step(
      'review-publication',
      '[data-tour-id="review-publication-btn"]',
      'reviewPublicationTitle',
      'reviewPublicationDesc',
    ),
  ];
}

export function getTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow',
  options?: { mobileLayout?: boolean },
): TourStepDefinition[] {
  const mobileLayout = options?.mobileLayout ?? isMobileEditorLayout();
  const base = getBaseTourSteps(path, mode);
  if (!mobileLayout) return base;
  return [MOBILE_MENU_STEP, ...base];
}

function getBaseTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow',
): TourStepDefinition[] {
  if (path === 'sections' || (path === 'freeflow_import' && mode === 'sections')) {
    return [
      step(
        'sections-overview',
        '[data-tour-id="section-list"]',
        'sectionsOverviewTitle',
        'sectionsOverviewDesc',
      ),
      ...getTopBarSteps(),
      step('echo-panel', '[data-tour-id="echo-panel"]', 'echoPanelTitle', 'echoPanelDesc'),
      step(
        'edit-section',
        '[data-tour-id="edit-section-btn"]',
        'editSectionTitle',
        'editSectionDesc',
      ),
      step('ai-credits', '[data-tour-id="ai-credits"]', 'aiCreditsTitle', 'aiCreditsDesc'),
      step(
        'echo-voice',
        '[data-tour-id="echo-voice-output"]',
        'echoVoiceTitle',
        'echoVoiceDesc',
      ),
      ...getSharedSidebarSteps(),
    ];
  }

  if (path === 'freeflow_import') {
    return [
      ...getTopBarSteps(),
      step('editor-main', '[data-tour-id="editor-main"]', 'freeflowEditorTitle', 'freeflowEditorDesc'),
      step('echo-bubble', '[data-tour-id="echo-bubble"]', 'echoBubbleTitle', 'echoBubbleDesc'),
      step(
        'echo-voice',
        '[data-tour-id="echo-bubble"]',
        'echoVoiceFreeflowTitle',
        'echoVoiceFreeflowDesc',
      ),
      ...getSharedSidebarSteps(),
    ];
  }

  // publish_ready
  return [
    ...getTopBarSteps(),
    step('import-text', '[data-tour-id="import-btn"]', 'publishImportTitle', 'publishImportDesc'),
    step('editor-main', '[data-tour-id="editor-main"]', 'publishFinalTitle', 'publishFinalDesc'),
    step('export-text', '[data-tour-id="export-pdf-btn"]', 'publishExportTitle', 'publishExportDesc'),
    step('notes', '[data-tour-id="notes-btn"]', 'notesTitle', 'notesDesc'),
    step('photos', '[data-tour-id="photos-btn"]', 'photosTitle', 'photosDesc'),
    step(
      'book-structure',
      '[data-tour-id="book-structure-btn"]',
      'bookStructureTitle',
      'bookStructureDesc',
    ),
    step(
      'review-publication',
      '[data-tour-id="review-publication-btn"]',
      'reviewPublicationTitle',
      'reviewPublicationDesc',
    ),
  ];
}
