import { describe, expect, it } from 'vitest';
import { GALLERY_PHOTO_LAYOUTS } from '@/lib/biography-media-constants';

describe('GALLERY_PHOTO_LAYOUTS', () => {
  it('è esattamente full-page, two-vertical, two-horizontal, three-mixed', () => {
    expect([...GALLERY_PHOTO_LAYOUTS]).toEqual([
      'full-page',
      'two-vertical',
      'two-horizontal',
      'three-mixed',
    ]);
    expect(GALLERY_PHOTO_LAYOUTS).not.toContain('cover');
    expect(GALLERY_PHOTO_LAYOUTS).not.toContain('cover_a5');
  });
});
