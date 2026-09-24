import { describe, expect, it } from 'vitest';
import { eraseNotice, versionToErase } from '@/lib/erase-prior-content';

describe('erasePriorContent choice', () => {
  it('removes the only stored version', () => {
    expect(versionToErase([{ version: 1, status: 'stored' }])).toBe(1);
  });

  it('removes the previous version and keeps the newest', () => {
    expect(
      versionToErase([
        { version: 1, status: 'stored' },
        { version: 2, status: 'stored' },
      ])
    ).toBe(1);
  });

  it('tells the reporter that downloaded copies cannot be recalled', () => {
    const text = eraseNotice('it', ['archive/v1', 'content_html_legacy']);
    expect(text).toContain('non si possono ritirare');
    expect(text).toContain('cache dei motori');
    expect(text).toContain('archive/v1');
  });
});
