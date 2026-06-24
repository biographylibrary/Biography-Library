import { differenceInCalendarDays, isPast } from 'date-fns';

export const CHAPTER_COOLDOWN_DAYS = 365;

export type ChapterCooldownState = {
  available: boolean;
  availableAt: Date | null;
  daysRemaining: number;
  chaptersCount: number;
};

type CooldownBiography = {
  status: string;
  next_chapter_available_at?: string | null;
  chapters_count?: number;
};

export function getChapterCooldownState(
  biography: CooldownBiography | null | undefined
): ChapterCooldownState | null {
  if (!biography || biography.status !== 'published') return null;

  const chaptersCount = biography.chapters_count ?? 0;
  if (!biography.next_chapter_available_at) {
    return {
      available: chaptersCount === 0,
      availableAt: null,
      daysRemaining: 0,
      chaptersCount,
    };
  }

  const availableAt = new Date(biography.next_chapter_available_at);
  const available = isPast(availableAt) || availableAt.getTime() <= Date.now();
  const daysRemaining = available
    ? 0
    : Math.max(1, differenceInCalendarDays(availableAt, new Date()));

  return {
    available,
    availableAt,
    daysRemaining,
    chaptersCount,
  };
}

export function canPublishNextChapter(biography: CooldownBiography | null | undefined): boolean {
  const state = getChapterCooldownState(biography);
  if (!state) return true;
  if (state.chaptersCount === 0) return true;
  return state.available;
}
