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

function bookTitleStep(): TourStepDefinition {
  return step('book-title', '[data-tour-id="book-title-btn"]', 'bookTitleTitle', 'bookTitleDesc');
}

function editorChromeSteps(): TourStepDefinition[] {
  return [
    step('import-text', '[data-tour-id="import-btn"]', 'importTextTitle', 'importTextDesc'),
    step('export-text', '[data-tour-id="export-pdf-btn"]', 'exportTextTitle', 'exportTextDesc'),
    step('editor-tools', '[data-tour-id="editor-tools-btn"]', 'editorToolsTitle', 'editorToolsDesc'),
    step('privacy', '[data-tour-id="privacy-btn"]', 'privacyTitle', 'privacyDesc'),
  ];
}

function permanenceStep(
  biographyType: 'autobiography' | 'memorial',
): TourStepDefinition {
  return biographyType === 'memorial'
    ? step(
        'permanence',
        '[data-tour-id="permanence-btn"]',
        'permanenceMemorialTitle',
        'permanenceMemorialDesc',
      )
    : step(
        'permanence',
        '[data-tour-id="permanence-btn"]',
        'permanenceSelfTitle',
        'permanenceSelfDesc',
      );
}

function getSharedSidebarSteps(
  biographyType: 'autobiography' | 'memorial',
): TourStepDefinition[] {
  return [
    permanenceStep(biographyType),
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

export function getTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow',
  options?: { mobileLayout?: boolean; biographyType?: 'autobiography' | 'memorial' },
): TourStepDefinition[] {
  const mobileLayout = options?.mobileLayout ?? isMobileEditorLayout();
  const base = getBaseTourSteps(path, mode, options?.biographyType ?? 'autobiography').map((item) =>
    mobileLayout && item.id === 'chapter-title'
      ? { ...item, target: '[data-tour-id="formatting-menu-btn"]' }
      : item
  );
  if (!mobileLayout) return base;
  return [MOBILE_MENU_STEP, ...base];
}

function getBaseTourSteps(
  _path: WritingPath,
  _mode: 'sections' | 'freeflow',
  biographyType: 'autobiography' | 'memorial',
): TourStepDefinition[] {
  return [
    bookTitleStep(),
    step(
      'sections-overview',
      '[data-tour-id="section-list"]',
      'sectionsOverviewTitle',
      'sectionsOverviewDesc',
    ),
    step(
      'edit-section',
      '[data-tour-id="edit-section-btn"]',
      'editSectionTitle',
      'editSectionDesc',
    ),
    step(
      'chapter-title',
      '[data-tour-id="chapter-title-btn"]',
      'chapterTitleTourTitle',
      'chapterTitleTourDesc',
    ),
    step('echo-panel', '[data-tour-id="echo-panel"]', 'echoPanelTitle', 'echoPanelDesc'),
    step('ai-credits', '[data-tour-id="ai-credits"]', 'aiCreditsTitle', 'aiCreditsDesc'),
    step(
      'echo-voice',
      '[data-tour-id="echo-voice-output"]',
      'echoVoiceTitle',
      'echoVoiceDesc',
    ),
    ...editorChromeSteps(),
    ...getSharedSidebarSteps(biographyType),
  ];
}
