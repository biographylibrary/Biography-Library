import { describe, expect, it } from 'vitest';
import { reportLane, type ReportType } from '@/lib/moderation/types';

describe('reportLane', () => {
  it('puts living person and illegal content on the immediate lane', () => {
    expect(reportLane('living_person')).toBe('immediate');
    expect(reportLane('illegal_content')).toBe('immediate');
  });

  it('puts ordinary types on the ordinary lane', () => {
    const ordinary: ReportType[] = [
      'right_to_oblivion',
      'sensitive_personal_data',
      'defamation',
      'copyright',
      'other',
    ];
    for (const type of ordinary) {
      expect(reportLane(type)).toBe('ordinary');
    }
  });

  it('keeps level 1 on its existing lane and leaves other types unclassified', () => {
    expect(reportLane('level1_content')).toBe('level1');
    expect(reportLane('level2_content')).toBeNull();
    expect(reportLane('impersonation')).toBeNull();
  });
});
