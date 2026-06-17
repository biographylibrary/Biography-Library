-- Short author/copyright leaf at front of PDF (optional; legal back-cover remains mandatory)
ALTER TABLE public.biography_book_structure
  ADD COLUMN IF NOT EXISTS include_author_copyright_page boolean NOT NULL DEFAULT false;
