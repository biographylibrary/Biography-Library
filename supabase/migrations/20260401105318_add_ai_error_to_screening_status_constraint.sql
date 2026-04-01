/*
  # Add 'ai_error' to ai_screening_status allowed values

  ## Summary
  The ai_screening_status column on biographies previously allowed:
  'pending', 'passed', 'flagged', 'parse_error'

  This migration replaces the CHECK constraint to also allow 'ai_error',
  which is set when AI screening fails for any reason (timeout, network
  error, HTTP error, parse error) and the biography is routed to manual review.

  ## Changes
  - **biographies** table:
    - Drops old CHECK constraint `biographies_ai_screening_status_check`
    - Adds new CHECK constraint with 'ai_error' included

  ## Notes
  1. 'parse_error' is retained for backwards compatibility with existing rows.
  2. Going forward, all AI failure modes will use 'ai_error'.
  3. No data is modified.
*/

ALTER TABLE biographies
  DROP CONSTRAINT IF EXISTS biographies_ai_screening_status_check;

ALTER TABLE biographies
  ADD CONSTRAINT biographies_ai_screening_status_check
  CHECK (ai_screening_status = ANY (ARRAY[
    'pending'::text,
    'passed'::text,
    'flagged'::text,
    'parse_error'::text,
    'ai_error'::text
  ]));
