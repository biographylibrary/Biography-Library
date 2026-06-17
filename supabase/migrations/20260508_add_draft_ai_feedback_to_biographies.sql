ALTER TABLE biographies
  ADD COLUMN IF NOT EXISTS draft_ai_feedback jsonb;

