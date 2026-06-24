import type { EchoPageContext } from '@/lib/echo/echo-context';
import type { Translations } from '@/lib/i18n/translations';
import type { EchoIcebreakerPoolSet } from '@/lib/i18n/echo-guide-content';

export type EchoIcebreakerTrigger =
  | 'initial'
  | 'after_reply'
  | 'section_change'
  | 'bubble_open';

const WRITING_COUNT = 2;
const CAPABILITY_COUNT = 1;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function applySection(text: string, sectionTitle: string): string {
  return text.replace(/\{section\}/g, sectionTitle);
}

function poolForContext(
  echoPage: EchoPageContext,
  onboardingIncomplete: boolean,
  trigger: EchoIcebreakerTrigger,
  pools: Translations['echo']['icebreakerPools']
): EchoIcebreakerPoolSet {
  if (trigger === 'after_reply' || trigger === 'bubble_open') {
    return pools.nudge;
  }
  if (onboardingIncomplete) return pools.hubOnboarding;
  if (echoPage === 'hub') return pools.hub;
  if (echoPage === 'editor_sections') return pools.editorSections;
  if (echoPage === 'editor_freeflow') return pools.editorFreeflow;
  if (echoPage === 'publication') return pools.publication;
  if (trigger === 'section_change') return pools.editorSections;
  return pools.nudge;
}

export type EchoIcebreakerItem = {
  text: string;
  kind: 'writing' | 'capability' | 'usage-guide';
};

export function pickEchoIcebreakers(params: {
  echoPage: EchoPageContext;
  onboardingIncomplete: boolean;
  activeSectionTitle?: string;
  trigger: EchoIcebreakerTrigger;
  t: Translations;
  exclude?: string[];
}): EchoIcebreakerItem[] {
  const { echoPage, onboardingIncomplete, activeSectionTitle, trigger, t, exclude = [] } = params;
  const pool = poolForContext(echoPage, onboardingIncomplete, trigger, t.echo.icebreakerPools);
  const sectionTitle = activeSectionTitle?.trim() || t.echo.icebreakerDefaultSection;

  const mapPool = (lines: string[]) =>
    lines
      .map((line) => applySection(line, sectionTitle))
      .filter((line) => !exclude.includes(line));

  const writing = shuffle(mapPool(pool.writing)).slice(0, WRITING_COUNT);
  const capabilities = shuffle(mapPool(pool.capabilities)).slice(0, CAPABILITY_COUNT);

  const dynamic: EchoIcebreakerItem[] = [
    ...writing.map((text) => ({ text, kind: 'writing' as const })),
    ...capabilities.map((text) => ({ text, kind: 'capability' as const })),
  ];

  return [
    ...dynamic,
    { text: t.echo.usageGuideIcebreaker, kind: 'usage-guide' },
  ];
}

/** @deprecated Use item.text from pickEchoIcebreakers */
export function echoIcebreakerTexts(items: EchoIcebreakerItem[]): string[] {
  return items.map((item) => item.text);
}
