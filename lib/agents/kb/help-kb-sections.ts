/**
 * Help knowledge base split into RAG sections, 4 locales.
 * English sections: generated from docs/PLATFORM_KB.md (npm run kb:sync).
 * IT/FR/DE: lib/agents/kb/help-kb-sections.locales.ts — update when platform rules change.
 */

import {
  HELP_KB_EN_SECTION_KEYS,
  HELP_KB_EN_SECTIONS,
} from './help-kb-sections.en.generated';
import { HELP_KB_LOCALE_SECTIONS } from './help-kb-sections.locales';

export type KbLocale = 'en' | 'it' | 'fr' | 'de';

export type KbSection = {
  sourceKey: string;
  content: Record<KbLocale, string>;
};

export const HELP_KB_SECTIONS: KbSection[] = HELP_KB_EN_SECTION_KEYS.map((sourceKey) => {
  const en = HELP_KB_EN_SECTIONS[sourceKey];
  const locales = HELP_KB_LOCALE_SECTIONS[sourceKey];
  if (!en) {
    throw new Error(`Missing EN section for ${sourceKey} in PLATFORM_KB.md`);
  }
  if (!locales) {
    throw new Error(`Missing IT/FR/DE locales for ${sourceKey} in help-kb-sections.locales.ts`);
  }
  return {
    sourceKey,
    content: {
      en,
      it: locales.it,
      fr: locales.fr,
      de: locales.de,
    },
  };
});

export const KB_LOCALES: KbLocale[] = ['en', 'it', 'fr', 'de'];
