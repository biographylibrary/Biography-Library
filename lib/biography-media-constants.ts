/** Max gallery photos per biography (excludes cover / cover_a5 rows). */
export const MAX_BIOGRAPHY_GALLERY_PHOTOS = 15;

/** Gallery photo layouts (excludes cover / cover_a5). */
export const GALLERY_PHOTO_LAYOUTS = [
  'full-page',
  'two-vertical',
  'two-horizontal',
  'three-mixed',
] as const;

export type GalleryPhotoLayout = (typeof GALLERY_PHOTO_LAYOUTS)[number];
