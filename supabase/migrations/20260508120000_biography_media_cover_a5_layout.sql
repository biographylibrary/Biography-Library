-- Allow custom full-bleed A5 cover uploads (layout cover_a5) alongside existing layouts.

ALTER TABLE biography_media DROP CONSTRAINT IF EXISTS biography_media_layout_check;

ALTER TABLE biography_media ADD CONSTRAINT biography_media_layout_check
  CHECK (
    layout IN (
      'full-page',
      'cover',
      'cover_a5',
      'two-vertical',
      'two-horizontal',
      'three-mixed'
    )
  );
