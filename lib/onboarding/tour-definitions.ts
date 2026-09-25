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
    step('import-text', '[data-tour-id="import-btn"]', 'importTextTitle', 'importTextDesc'),
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
  const base = getBaseTourSteps(path, mode, options?.biographyType ?? 'autobiography');
  if (!mobileLayout) return base;
  return [MOBILE_MENU_STEP, ...base];
}

function getBaseTourSteps(
  path: WritingPath,
  mode: 'sections' | 'freeflow',
  biographyType: 'autobiography' | 'memorial',
): TourStepDefinition[] {
  if (path === 'sections' || (path === 'freeflow_import' && mode === 'sections')) {
    return [
      bookTitleStep(),
      step(
        'sections-overview',
        '[data-tour-id="section-list"]',
        'sectionsOverviewTitle',
        'sectionsOverviewDesc',
      ),
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
      ...editorChromeSteps(),
      ...getSharedSidebarSteps(biographyType),
    ];
  }

  if (path === 'freeflow_import') {
    return [
      bookTitleStep(),
      step('editor-main', '[data-tour-id="editor-main"]', 'freeflowEditorTitle', 'freeflowEditorDesc'),
      step('echo-bubble', '[data-tour-id="echo-bubble"]', 'echoBubbleTitle', 'echoBubbleDesc'),
      step(
        'echo-voice',
        '[data-tour-id="echo-bubble"]',
        'echoVoiceFreeflowTitle',
        'echoVoiceFreeflowDesc',
      ),
      ...editorChromeSteps(),
      ...getSharedSidebarSteps(biographyType),
    ];
  }

  // publish_ready
  return [
    bookTitleStep(),
    step('editor-main', '[data-tour-id="editor-main"]', 'publishFinalTitle', 'publishFinalDesc'),
    step('export-text', '[data-tour-id="export-pdf-btn"]', 'publishExportTitle', 'publishExportDesc'),
    step('editor-tools', '[data-tour-id="editor-tools-btn"]', 'editorToolsTitle', 'editorToolsDesc'),
    step('privacy', '[data-tour-id="privacy-btn"]', 'privacyTitle', 'privacyDesc'),
    step('import-text', '[data-tour-id="import-btn"]', 'publishImportTitle', 'publishImportDesc'),
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
