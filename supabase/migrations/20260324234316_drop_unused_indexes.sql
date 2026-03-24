/*
  # Drop unused indexes

  ## Summary
  Removes indexes that have never been used according to pg_stat_user_indexes.
  These indexes consume storage and slow down writes without benefiting reads.

  ## Dropped Indexes
  - idx_biographies_user_id (biographies)
  - idx_biography_sections_biography_id (biography_sections)
  - idx_section_todos_completed (section_todos)
  - idx_section_todos_due_date (section_todos)
  - idx_biography_sections_status (biography_sections)
  - idx_biography_sections_approved_at (biography_sections)
  - idx_biography_sections_biography_section (biography_sections)
  - biographies_share_token_idx (biographies)
  - idx_profiles_language (profiles)
  - idx_biographies_content_language (biographies)
  - idx_section_completions_user_id (section_completions)
  - idx_narrative_structures_biography_id (narrative_structures)
  - idx_narrative_structures_user_id (narrative_structures)
  - idx_section_completions_biography_id (section_completions)
  - idx_biographies_published_at (biographies)
*/

DROP INDEX IF EXISTS public.idx_biographies_user_id;
DROP INDEX IF EXISTS public.idx_biography_sections_biography_id;
DROP INDEX IF EXISTS public.idx_section_todos_completed;
DROP INDEX IF EXISTS public.idx_section_todos_due_date;
DROP INDEX IF EXISTS public.idx_biography_sections_status;
DROP INDEX IF EXISTS public.idx_biography_sections_approved_at;
DROP INDEX IF EXISTS public.idx_biography_sections_biography_section;
DROP INDEX IF EXISTS public.biographies_share_token_idx;
DROP INDEX IF EXISTS public.idx_profiles_language;
DROP INDEX IF EXISTS public.idx_biographies_content_language;
DROP INDEX IF EXISTS public.idx_section_completions_user_id;
DROP INDEX IF EXISTS public.idx_narrative_structures_biography_id;
DROP INDEX IF EXISTS public.idx_narrative_structures_user_id;
DROP INDEX IF EXISTS public.idx_section_completions_biography_id;
DROP INDEX IF EXISTS public.idx_biographies_published_at;
