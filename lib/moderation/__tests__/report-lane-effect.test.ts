import { describe, expect, it } from 'vitest';
import { laneEffect } from '@/lib/moderation/report-lane-effect';

describe('laneEffect', () => {
  it('suspends a published biography on the immediate lane', () => {
    expect(laneEffect('living_person', 'published')).toEqual({ kind: 'suspend' });
    expect(laneEffect('illegal_content', 'published')).toEqual({ kind: 'suspend' });
  });

  it('leaves a published biography public on the ordinary lane', () => {
    expect(laneEffect('right_to_oblivion', 'published')).toEqual({ kind: 'none' });
    expect(laneEffect('sensitive_personal_data', 'published')).toEqual({ kind: 'none' });
    expect(laneEffect('defamation', 'published')).toEqual({ kind: 'none' });
    expect(laneEffect('copyright', 'published')).toEqual({ kind: 'none' });
    expect(laneEffect('other', 'published')).toEqual({ kind: 'none' });
  });

  it('removes a published biography for level 1 without suspending it', () => {
    expect(laneEffect('level1_content', 'published')).toEqual({ kind: 'remove' });
  });

  it('does not change a biography that is not public yet', () => {
    expect(laneEffect('living_person', 'draft')).toEqual({ kind: 'none' });
    expect(laneEffect('level1_content', 'under_review')).toEqual({ kind: 'none' });
  });
});
