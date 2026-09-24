import { describe, expect, it } from 'vitest';
import {
  APPEAL_DAYS,
  appealWindowOpen,
  dueDayReminders,
  isPastDays,
  reportClosedAt,
  reporterPiiDue,
} from '@/lib/moderation/report-deadlines';

const start = '2026-01-01T00:00:00.000Z';

describe('report deadlines', () => {
  it('sends reviewer reminders at 7, 21 and 28 days, once each', () => {
    const day8 = new Date('2026-01-09T00:00:00.000Z');
    expect(dueDayReminders(start, day8, [7, 21, 28], [false, false, false])).toEqual([7]);
    const day29 = new Date('2026-01-30T00:00:00.000Z');
    expect(dueDayReminders(start, day29, [7, 21, 28], [true, false, false])).toEqual([21, 28]);
  });

  it('marks the author revision overdue after 30 days', () => {
    expect(isPastDays(start, new Date('2026-01-30T00:00:00.000Z'), 30)).toBe(false);
    expect(isPastDays(start, new Date('2026-01-31T00:00:00.000Z'), 30)).toBe(true);
  });

  it('keeps the appeal window to 14 days and refuses a second appeal', () => {
    const decided = '2026-02-01T00:00:00.000Z';
    const inside = new Date('2026-02-15T00:00:00.000Z');
    const outside = new Date(new Date(decided).getTime() + (APPEAL_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(appealWindowOpen(decided, inside, null)).toBe(true);
    expect(appealWindowOpen(decided, outside, null)).toBe(false);
    expect(appealWindowOpen(decided, inside, 'pending')).toBe(false);
  });

  it('erases unregistered reporter details 12 months after the case closes', () => {
    const closed = reportClosedAt('2026-01-01T00:00:00.000Z', '2026-01-20T00:00:00.000Z');
    expect(closed).toBe('2026-01-20T00:00:00.000Z');
    expect(reporterPiiDue(closed, new Date('2027-01-19T00:00:00.000Z'), false)).toBe(false);
    expect(reporterPiiDue(closed, new Date('2027-01-20T00:00:00.000Z'), false)).toBe(true);
    expect(reporterPiiDue(closed, new Date('2027-02-01T00:00:00.000Z'), true)).toBe(false);
  });
});
