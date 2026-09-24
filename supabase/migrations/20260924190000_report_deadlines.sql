/*
  # Promemoria delle segnalazioni

  Le date già note (created_at, decided_at, appeal_*) restano l'orologio.
  Queste colonne ricordano solo che un avviso è già partito, così il cron non lo ripete.
  author_revision_requested_at parte quando il revisore chiede la modifica.
*/

ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS author_revision_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_reminder_7_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_reminder_21_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_reminder_28_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS author_reminder_7_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS author_reminder_25_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS documentation_overdue_noted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporter_pii_erased_at timestamptz;

COMMENT ON COLUMN public.moderation_reports.author_revision_requested_at IS
  'Inizio dei 30 giorni dell''autore in revision_requested.';

COMMENT ON COLUMN public.moderation_reports.reporter_pii_erased_at IS
  'Nome ed email di un segnalante senza account, cancellati 12 mesi dopo la chiusura. La decisione resta.';
