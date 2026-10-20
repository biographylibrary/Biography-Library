import { describe, expect, it } from 'vitest';
import { resolveMaintenanceLocale } from '@/lib/maintenance/messages';
import { buildMaintenanceHtml } from '@/lib/maintenance/page';

describe('resolveMaintenanceLocale', () => {
  it('prefers bl_lang cookie over Accept-Language', () => {
    expect(resolveMaintenanceLocale('en-US,en;q=0.9', 'it')).toBe('it');
  });

  it('uses Accept-Language then defaults to en', () => {
    expect(resolveMaintenanceLocale('fr-CH,fr;q=0.9', null)).toBe('fr');
    expect(resolveMaintenanceLocale('zh-CN', null)).toBe('en');
  });
});

describe('buildMaintenanceHtml', () => {
  it('includes noindex and localized copy', () => {
    const html = buildMaintenanceHtml('it');
    expect(html).toContain('noindex');
    expect(html).toContain('Torniamo presto');
    expect(html).toContain('lang="it"');
  });
});
