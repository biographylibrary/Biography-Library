import { OPEN_EDITOR_TOOLS_EVENT, waitForTransition } from '@/lib/onboarding/tour-mobile';

export type OpenLanguageToolsActions = {
  /** True when the editor sidebar is in the mobile drawer layout. */
  isMobileLayout: boolean;
  openMobileSidebar: () => void;
  /** Dispatch OPEN_EDITOR_TOOLS_EVENT (or equivalent). */
  expandTools: () => void;
  waitMs?: number;
  /** Optional wait (defaults to waitForTransition); injected in unit tests. */
  wait?: (ms: number) => Promise<void>;
  /** Selectors to scroll into view and briefly highlight (e.g. language + translate). */
  highlightSelectors: string[];
  /** Apply temporary highlight class; caller clears after ~2s. */
  highlight: (selectors: string[]) => void;
  scrollIntoView: (selector: string) => void;
};

/**
 * Brings the user to Tools → language (and translate when present).
 * Under lg: open the drawer first, then expand Tools, then scroll/highlight.
 * From lg up: expand Tools only, then scroll/highlight.
 */
export async function openLanguageTools(actions: OpenLanguageToolsActions): Promise<void> {
  const waitMs = actions.waitMs ?? 280;
  const wait = actions.wait ?? waitForTransition;
  if (actions.isMobileLayout) {
    actions.openMobileSidebar();
    await wait(waitMs);
  }
  actions.expandTools();
  await wait(waitMs);
  const first = actions.highlightSelectors[0];
  if (first) actions.scrollIntoView(first);
  actions.highlight(actions.highlightSelectors);
}

/** Dispatches the existing tools-open event used by SectionSidebar. */
export function dispatchOpenEditorTools(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EDITOR_TOOLS_EVENT));
}
