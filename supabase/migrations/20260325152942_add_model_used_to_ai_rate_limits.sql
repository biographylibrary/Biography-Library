/*
  # Add model_used column to ai_rate_limits

  1. Changes
    - `ai_rate_limits`: adds `model_used` (text, nullable) to record which AI model
      was used for each request (e.g. "mistral3", "Apertus-70B-Instruct-2509")

  2. Notes
    - Column is nullable so existing rows are unaffected
    - No RLS changes needed; existing policies cover the new column
*/

ALTER TABLE ai_rate_limits
ADD COLUMN IF NOT EXISTS model_used text;
