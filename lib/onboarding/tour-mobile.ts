/** Matches editor layout: sidebar drawer below Tailwind `lg` (1024px). */
export const MOBILE_EDITOR_MEDIA = '(max-width: 1023px)';

export function isMobileEditorLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_EDITOR_MEDIA).matches;
}

const SIDEBAR_TOUR_TARGETS = new Set([
  '[data-tour-id="section-list"]',
  '[data-tour-id="permanence-btn"]',
  '[data-tour-id="notes-btn"]',
  '[data-tour-id="photos-btn"]',
  '[data-tour-id="book-structure-btn"]',
  '[data-tour-id="import-btn"]',
  '[data-tour-id="review-publication-btn"]',
  '[data-tour-id="export-pdf-btn"]',
  '[data-tour-id="book-title-btn"]',
  '[data-tour-id="privacy-btn"]',
]);

export const OPEN_EDITOR_TOOLS_EVENT = 'bl-open-editor-tools';
export const EDITOR_SIDEBAR_TOGGLE_EVENT = 'bl-editor-sidebar-toggle';
export const EDITOR_SIDEBAR_STATE_EVENT = 'bl-editor-sidebar-state';

export function isSidebarTourTarget(target: string): boolean {
  return SIDEBAR_TOUR_TARGETS.has(target);
}

export function isSidebarTourActionTarget(target?: string): boolean {
  return target != null && SIDEBAR_TOUR_TARGETS.has(target);
}

export const MOBILE_SIDEBAR_TOGGLE_SELECTOR = '[data-tour-id="mobile-sidebar-toggle"]';

export function waitForTransition(ms = 280): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
