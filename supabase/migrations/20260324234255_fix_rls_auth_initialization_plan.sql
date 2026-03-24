/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces bare `auth.uid()` / `auth.jwt()` calls in all RLS policies with
  `(select auth.uid())` / `(select auth.jwt())` so the auth function is
  evaluated once per query instead of once per row, significantly improving
  performance at scale.

  ## Affected Tables
  - profiles (3 policies)
  - section_notes (4 policies — use subquery via biographies.user_id)
  - section_todos (4 policies — use subquery via biographies.user_id)
  - ai_rate_limits (2 policies)
  - biography_sections (4 policies — use subquery via biographies.user_id)
  - ai_usage_tracking (1 policy)
  - biographies (6 policies)
  - reviewer_languages (3 policies)
  - section_completions (4 policies)
  - narrative_structures (4 policies)
  - biography_media (4 policies)
  - moderation_messages (2 policies)
  - moderation_reports (2 policies — Reporters/Staff SELECT + Staff UPDATE)
  - conversation_checkpoints (4 policies)
*/

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================
-- section_notes  (no user_id column; ownership via biographies)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own section notes" ON public.section_notes;
DROP POLICY IF EXISTS "Users can insert own section notes" ON public.section_notes;
DROP POLICY IF EXISTS "Users can update own section notes" ON public.section_notes;
DROP POLICY IF EXISTS "Users can view own section notes" ON public.section_notes;

CREATE POLICY "Users can view own section notes"
  ON public.section_notes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_notes.biography_id));

CREATE POLICY "Users can insert own section notes"
  ON public.section_notes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_notes.biography_id));

CREATE POLICY "Users can update own section notes"
  ON public.section_notes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_notes.biography_id))
  WITH CHECK ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_notes.biography_id));

CREATE POLICY "Users can delete own section notes"
  ON public.section_notes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_notes.biography_id));

-- ============================================================
-- section_todos  (no user_id column; ownership via biographies)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own section todos" ON public.section_todos;
DROP POLICY IF EXISTS "Users can insert own section todos" ON public.section_todos;
DROP POLICY IF EXISTS "Users can update own section todos" ON public.section_todos;
DROP POLICY IF EXISTS "Users can view own section todos" ON public.section_todos;

CREATE POLICY "Users can view own section todos"
  ON public.section_todos FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_todos.biography_id));

CREATE POLICY "Users can insert own section todos"
  ON public.section_todos FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_todos.biography_id));

CREATE POLICY "Users can update own section todos"
  ON public.section_todos FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_todos.biography_id))
  WITH CHECK ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_todos.biography_id));

CREATE POLICY "Users can delete own section todos"
  ON public.section_todos FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = ( SELECT biographies.user_id FROM biographies WHERE biographies.id = section_todos.biography_id));

-- ============================================================
-- ai_rate_limits
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own rate limit records" ON public.ai_rate_limits;
DROP POLICY IF EXISTS "Users can read own rate limit records" ON public.ai_rate_limits;

CREATE POLICY "Users can read own rate limit records"
  ON public.ai_rate_limits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own rate limit records"
  ON public.ai_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- biography_sections  (no user_id column; ownership via biographies)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own biography sections" ON public.biography_sections;
DROP POLICY IF EXISTS "Users can insert own biography sections" ON public.biography_sections;
DROP POLICY IF EXISTS "Users can read own biography sections" ON public.biography_sections;
DROP POLICY IF EXISTS "Users can update own biography sections" ON public.biography_sections;

CREATE POLICY "Users can read own biography sections"
  ON public.biography_sections FOR SELECT
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM biographies WHERE biographies.id = biography_sections.biography_id AND biographies.user_id = (select auth.uid())));

CREATE POLICY "Users can insert own biography sections"
  ON public.biography_sections FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS ( SELECT 1 FROM biographies WHERE biographies.id = biography_sections.biography_id AND biographies.user_id = (select auth.uid())));

CREATE POLICY "Users can update own biography sections"
  ON public.biography_sections FOR UPDATE
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM biographies WHERE biographies.id = biography_sections.biography_id AND biographies.user_id = (select auth.uid())))
  WITH CHECK (EXISTS ( SELECT 1 FROM biographies WHERE biographies.id = biography_sections.biography_id AND biographies.user_id = (select auth.uid())));

CREATE POLICY "Users can delete own biography sections"
  ON public.biography_sections FOR DELETE
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM biographies WHERE biographies.id = biography_sections.biography_id AND biographies.user_id = (select auth.uid())));

-- ============================================================
-- ai_usage_tracking
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read own usage" ON public.ai_usage_tracking;

CREATE POLICY "Authenticated users can read own usage"
  ON public.ai_usage_tracking FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- biographies
-- ============================================================
DROP POLICY IF EXISTS "Admins can freeze biographies" ON public.biographies;
DROP POLICY IF EXISTS "Authenticated users can view public biographies" ON public.biographies;
DROP POLICY IF EXISTS "Public biographies accessible via share token" ON public.biographies;
DROP POLICY IF EXISTS "Users can delete own biographies" ON public.biographies;
DROP POLICY IF EXISTS "Users can insert own biographies" ON public.biographies;
DROP POLICY IF EXISTS "Users can read own biographies" ON public.biographies;
DROP POLICY IF EXISTS "Users can update own biographies" ON public.biographies;

CREATE POLICY "Users can read own biographies"
  ON public.biographies FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can view public biographies"
  ON public.biographies FOR SELECT
  TO authenticated
  USING ((privacy = 'public') OR (user_id = (select auth.uid())));

CREATE POLICY "Public biographies accessible via share token"
  ON public.biographies FOR SELECT
  TO authenticated
  USING ((privacy = 'public') AND (share_token IS NOT NULL));

CREATE POLICY "Users can insert own biographies"
  ON public.biographies FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own biographies"
  ON public.biographies FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own biographies"
  ON public.biographies FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can freeze biographies"
  ON public.biographies FOR UPDATE
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

-- ============================================================
-- reviewer_languages
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete language assignments" ON public.reviewer_languages;
DROP POLICY IF EXISTS "Admins can insert language assignments" ON public.reviewer_languages;
DROP POLICY IF EXISTS "Users can view own language assignments" ON public.reviewer_languages;

CREATE POLICY "Users can view own language assignments"
  ON public.reviewer_languages FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))));

CREATE POLICY "Admins can insert language assignments"
  ON public.reviewer_languages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

CREATE POLICY "Admins can delete language assignments"
  ON public.reviewer_languages FOR DELETE
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])));

-- ============================================================
-- section_completions
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own section completions" ON public.section_completions;
DROP POLICY IF EXISTS "Users can insert own section completions" ON public.section_completions;
DROP POLICY IF EXISTS "Users can update own section completions" ON public.section_completions;
DROP POLICY IF EXISTS "Users can view own section completions" ON public.section_completions;

CREATE POLICY "Users can view own section completions"
  ON public.section_completions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own section completions"
  ON public.section_completions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own section completions"
  ON public.section_completions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own section completions"
  ON public.section_completions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- narrative_structures
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own narrative structures" ON public.narrative_structures;
DROP POLICY IF EXISTS "Users can insert own narrative structures" ON public.narrative_structures;
DROP POLICY IF EXISTS "Users can update own narrative structures" ON public.narrative_structures;
DROP POLICY IF EXISTS "Users can view own narrative structures" ON public.narrative_structures;

CREATE POLICY "Users can view own narrative structures"
  ON public.narrative_structures FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own narrative structures"
  ON public.narrative_structures FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own narrative structures"
  ON public.narrative_structures FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own narrative structures"
  ON public.narrative_structures FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- biography_media
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own media" ON public.biography_media;
DROP POLICY IF EXISTS "Users can insert own media" ON public.biography_media;
DROP POLICY IF EXISTS "Users can update own media" ON public.biography_media;
DROP POLICY IF EXISTS "Users can view own media" ON public.biography_media;

CREATE POLICY "Users can view own media"
  ON public.biography_media FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own media"
  ON public.biography_media FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own media"
  ON public.biography_media FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own media"
  ON public.biography_media FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- moderation_messages
-- ============================================================
DROP POLICY IF EXISTS "Any authenticated user can send a message" ON public.moderation_messages;
DROP POLICY IF EXISTS "Internal messages visible to staff only" ON public.moderation_messages;

CREATE POLICY "Any authenticated user can send a message"
  ON public.moderation_messages FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Internal messages visible to staff only"
  ON public.moderation_messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN (is_internal = true) THEN (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])))
      ELSE (
        (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])))
        OR (EXISTS ( SELECT 1 FROM (moderation_reports mr JOIN biographies b ON b.id = mr.biography_id) WHERE mr.id = moderation_messages.report_id AND b.user_id = (select auth.uid())))
      )
    END
  );

-- ============================================================
-- moderation_reports
-- ============================================================
DROP POLICY IF EXISTS "Reporters see own reports; staff see all" ON public.moderation_reports;
DROP POLICY IF EXISTS "Staff can update reports" ON public.moderation_reports;

CREATE POLICY "Reporters see own reports; staff see all"
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = reporter_id) OR (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text]))));

CREATE POLICY "Staff can update reports"
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text, 'super_admin'::text])));

-- ============================================================
-- conversation_checkpoints
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own checkpoints" ON public.conversation_checkpoints;
DROP POLICY IF EXISTS "Users can insert own checkpoints" ON public.conversation_checkpoints;
DROP POLICY IF EXISTS "Users can update own checkpoints" ON public.conversation_checkpoints;
DROP POLICY IF EXISTS "Users can view own checkpoints" ON public.conversation_checkpoints;

CREATE POLICY "Users can view own checkpoints"
  ON public.conversation_checkpoints FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own checkpoints"
  ON public.conversation_checkpoints FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own checkpoints"
  ON public.conversation_checkpoints FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own checkpoints"
  ON public.conversation_checkpoints FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
