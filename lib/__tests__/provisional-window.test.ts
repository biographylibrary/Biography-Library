import { describe, expect, it } from 'vitest';
import {
  isWithinProvisionalWindow,
  provisionalUntilOnFirstPublish,
  republicationClock,
} from '@/lib/provisional-window';

describe('provisional window', () => {
  it('sets 30 days only for a memorial', () => {
    const until = provisionalUntilOnFirstPublish('memorial', '2026-01-01T00:00:00.000Z');
    expect(until).toBe('2026-01-31T00:00:00.000Z');
    expect(provisionalUntilOnFirstPublish('autobiography', '2026-01-01T00:00:00.000Z')).toBeNull();
  });

  it('marks the window only while the date is still ahead', () => {
    const until = '2026-01-31T00:00:00.000Z';
    expect(isWithinProvisionalWindow(until, new Date('2026-01-15T00:00:00.000Z'))).toBe(true);
    expect(isWithinProvisionalWindow(until, new Date('2026-01-31T00:00:00.000Z'))).toBe(false);
    expect(isWithinProvisionalWindow(null, new Date('2026-01-15T00:00:00.000Z'))).toBe(false);
  });

  it('restarts a memorial window from revised_at and leaves autobiographies without one', () => {
    expect(republicationClock('memorial', '2026-03-01T00:00:00.000Z')).toEqual({
      revised_at: '2026-03-01T00:00:00.000Z',
      provisional_until: '2026-03-31T00:00:00.000Z',
    });
    expect(republicationClock('autobiography', '2026-03-01T00:00:00.000Z')).toEqual({
      revised_at: '2026-03-01T00:00:00.000Z',
    });
  });
});
