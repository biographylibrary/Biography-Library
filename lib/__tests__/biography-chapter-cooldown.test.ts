import { describe, expect, it } from 'vitest';
import {
  canPublishNextChapter,
  getChapterCooldownState,
} from '../biography-chapter-cooldown';

describe('biography-chapter-cooldown', () => {
  it('returns null for non-published biographies', () => {
    expect(getChapterCooldownState({ status: 'draft' })).toBeNull();
  });

  it('allows first chapter publish', () => {
    expect(
      canPublishNextChapter({
        status: 'published',
        chapters_count: 0,
        next_chapter_available_at: null,
      })
    ).toBe(true);
  });

  it('blocks republication during cooldown', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const bio = {
      status: 'published',
      chapters_count: 1,
      next_chapter_available_at: future,
    };

    expect(canPublishNextChapter(bio)).toBe(false);
    expect(getChapterCooldownState(bio)?.available).toBe(false);
    expect(getChapterCooldownState(bio)?.daysRemaining).toBeGreaterThan(0);
  });

  it('allows republication after cooldown', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const bio = {
      status: 'published',
      chapters_count: 2,
      next_chapter_available_at: past,
    };

    expect(canPublishNextChapter(bio)).toBe(true);
    expect(getChapterCooldownState(bio)?.available).toBe(true);
  });
});
