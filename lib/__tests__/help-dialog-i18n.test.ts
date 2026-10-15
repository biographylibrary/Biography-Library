import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';
import { MANUAL_META } from '@/lib/help/manual-meta.generated';

describe('help dialog i18n', () => {
  it('ogni lingua ha titolo Aiuto senza carattere ? e senza helpChatbot', () => {
    for (const lang of ['en', 'it', 'fr', 'de'] as const) {
      const t = translations[lang];
      expect(t.helpDialog.title).toBeTruthy();
      expect(t.helpDialog.title.includes('?')).toBe(false);
      expect(t.helpDialog.requestAccess.length).toBeGreaterThan(3);
      expect((t as { helpChatbot?: unknown }).helpChatbot).toBeUndefined();
    }
  });

  it('meta manuale ha versione e hash', () => {
    expect(MANUAL_META.version).toMatch(/^\d+\.\d+$/);
    expect(MANUAL_META.hash.length).toBe(64);
  });
});
