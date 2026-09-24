import { describe, expect, it } from 'vitest';
import { getTourSteps } from '@/lib/onboarding/tour-definitions';

describe('onboarding tour permanence step', () => {
  it('uses the autobiography title before notes', () => {
    const steps = getTourSteps('sections', 'sections', {
      mobileLayout: false,
      biographyType: 'autobiography',
    });
    const permanence = steps.find((step) => step.id === 'permanence');
    const notes = steps.findIndex((step) => step.id === 'notes');
    expect(permanence?.titleKey).toBe('permanenceSelfTitle');
    expect(permanence?.target).toBe('[data-tour-id="permanence-btn"]');
    expect(steps.findIndex((step) => step.id === 'permanence')).toBeLessThan(notes);
  });

  it('uses the memorial title for a family biography', () => {
    const steps = getTourSteps('publish_ready', 'freeflow', {
      mobileLayout: false,
      biographyType: 'memorial',
    });
    expect(steps.find((step) => step.id === 'permanence')?.titleKey).toBe(
      'permanenceMemorialTitle'
    );
  });
});
