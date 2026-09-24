const DAY_MS = 24 * 60 * 60 * 1000;

export const REVIEWER_REMINDER_DAYS = [7, 21, 28] as const;
export const AUTHOR_REMINDER_DAYS = [7, 25] as const;
export const REVIEWER_DECISION_DAYS = 30;
export const AUTHOR_REVISION_DAYS = 30;
export const APPEAL_DAYS = 14;
export const DOCUMENTATION_DAYS = 14;
export const REPORTER_PII_MONTHS = 12;

export type ReviewerReminderDay = (typeof REVIEWER_REMINDER_DAYS)[number];
export type AuthorReminderDay = (typeof AUTHOR_REMINDER_DAYS)[number];

function startMs(iso: string): number {
  return new Date(iso).getTime();
}

export function dueDayReminders(
  startedAt: string,
  now: Date,
  days: readonly number[],
  alreadySent: ReadonlyArray<boolean>,
): number[] {
  const start = startMs(startedAt);
  if (Number.isNaN(start)) return [];
  const due: number[] = [];
  days.forEach((day, index) => {
    if (alreadySent[index]) return;
    if (now.getTime() >= start + day * DAY_MS) due.push(day);
  });
  return due;
}

export function isPastDays(startedAt: string, now: Date, days: number): boolean {
  const start = startMs(startedAt);
  if (Number.isNaN(start)) return false;
  return now.getTime() >= start + days * DAY_MS;
}

/** Appeal may be filed only inside 14 days of the decision. It does not change the biography. */
export function appealWindowOpen(decidedAt: string | null, now: Date, appealStatus: string | null): boolean {
  if (!decidedAt || appealStatus) return false;
  const decided = startMs(decidedAt);
  if (Number.isNaN(decided)) return false;
  return now.getTime() <= decided + APPEAL_DAYS * DAY_MS;
}

export function addUtcMonths(iso: string, months: number): Date {
  const date = new Date(iso);
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function reporterPiiDue(closedAt: string | null, now: Date, alreadyErased: boolean): boolean {
  if (!closedAt || alreadyErased) return false;
  return now.getTime() >= addUtcMonths(closedAt, REPORTER_PII_MONTHS).getTime();
}

/** Unregistered reporter: the close date is the appeal outcome, or the decision if there is no appeal. */
export function reportClosedAt(decidedAt: string | null, appealDecidedAt: string | null): string | null {
  return appealDecidedAt || decidedAt;
}
