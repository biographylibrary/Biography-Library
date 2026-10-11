import { describe, expect, it, vi } from 'vitest';
import { openLanguageTools } from '@/lib/editor/open-language-tools';

const wait = async () => {};

describe('openLanguageTools', () => {
  it('sotto lg apre il cassetto prima di espandere Strumenti', async () => {
    const order: string[] = [];
    await openLanguageTools({
      isMobileLayout: true,
      waitMs: 0,
      wait,
      openMobileSidebar: () => order.push('drawer'),
      expandTools: () => order.push('tools'),
      highlightSelectors: ['[data-tour-id="text-language-btn"]'],
      scrollIntoView: (s) => order.push(`scroll:${s}`),
      highlight: (sels) => order.push(`highlight:${sels.join(',')}`),
    });
    expect(order[0]).toBe('drawer');
    expect(order[1]).toBe('tools');
    expect(order).toContain('scroll:[data-tour-id="text-language-btn"]');
    expect(order).toContain('highlight:[data-tour-id="text-language-btn"]');
  });

  it('da lg non apre il cassetto', async () => {
    const openMobileSidebar = vi.fn();
    const order: string[] = [];
    await openLanguageTools({
      isMobileLayout: false,
      waitMs: 0,
      wait,
      openMobileSidebar,
      expandTools: () => order.push('tools'),
      highlightSelectors: [
        '[data-tour-id="text-language-btn"]',
        '[data-tour-id="translate-btn"]',
      ],
      scrollIntoView: () => order.push('scroll'),
      highlight: () => order.push('highlight'),
    });
    expect(openMobileSidebar).not.toHaveBeenCalled();
    expect(order[0]).toBe('tools');
  });

});
