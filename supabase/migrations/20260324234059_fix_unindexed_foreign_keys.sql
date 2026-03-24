/*
  # Add missing indexes for foreign keys

  ## Summary
  Adds covering indexes for all foreign key columns that lack them,
  preventing full table scans during JOIN operations and cascading deletes.

  ## New Indexes

  ### public.biographies
  - `idx_biographies_featured_by` on `featured_by` column

  ### public.biography_media
  - `idx_biography_media_biography_id` on `biography_id` column
  - `idx_biography_media_user_id` on `user_id` column

  ### public.moderation_messages
  - `idx_moderation_messages_recipient_id` on `recipient_id` column
  - `idx_moderation_messages_report_id` on `report_id` column
  - `idx_moderation_messages_sender_id` on `sender_id` column

  ### public.moderation_reports
  - `idx_moderation_reports_assigned_to` on `assigned_to` column
  - `idx_moderation_reports_biography_id` on `biography_id` column
  - `idx_moderation_reports_decided_by` on `decided_by` column
  - `idx_moderation_reports_reporter_id` on `reporter_id` column

  ### public.reviewer_languages
  - `idx_reviewer_languages_assigned_by` on `assigned_by` column
*/

CREATE INDEX IF NOT EXISTS idx_biographies_featured_by
  ON public.biographies (featured_by);

CREATE INDEX IF NOT EXISTS idx_biography_media_biography_id
  ON public.biography_media (biography_id);

CREATE INDEX IF NOT EXISTS idx_biography_media_user_id
  ON public.biography_media (user_id);

CREATE INDEX IF NOT EXISTS idx_moderation_messages_recipient_id
  ON public.moderation_messages (recipient_id);

CREATE INDEX IF NOT EXISTS idx_moderation_messages_report_id
  ON public.moderation_messages (report_id);

CREATE INDEX IF NOT EXISTS idx_moderation_messages_sender_id
  ON public.moderation_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_assigned_to
  ON public.moderation_reports (assigned_to);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_biography_id
  ON public.moderation_reports (biography_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_decided_by
  ON public.moderation_reports (decided_by);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_id
  ON public.moderation_reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_reviewer_languages_assigned_by
  ON public.reviewer_languages (assigned_by);
