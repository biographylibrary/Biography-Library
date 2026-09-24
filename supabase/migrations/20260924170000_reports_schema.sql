/*
  # Schema segnalazioni

  provisional_until esiste già (20260924130000): non si ricrea e non diventa uno stato.

  biographies
  - revised_at: data dell'ultima ripubblicazione accettata. published_at non si tocca.
  - stati nuovi: suspended_pending_verification, revision_requested,
    revision_pending_review, revision_overdue. Nessun valore provisional.

  moderation_reports
  - reporter_email / reporter_name: chi ha scritto senza account.
  - origin: in_app (modulo), email_channel (pratica aperta a mano), screening.
    Le righe già presenti restano NULL.
  - tipi di corsia distinti: illegal_content, sensitive_personal_data, defamation.
  - ricorso sul report, non sulla biografia: appeal_status pending | upheld | rejected.
    biography_status_before_decision è lo stato da ripristinare se il ricorso è accolto.
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS revised_at timestamptz;

COMMENT ON COLUMN public.biographies.revised_at IS
  'Ultima ripubblicazione accettata dal revisore. published_at e published_um_year non cambiano.';

ALTER TABLE public.biographies DROP CONSTRAINT IF EXISTS biographies_status_check;

ALTER TABLE public.biographies
  ADD CONSTRAINT biographies_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'sections_complete'::text,
    'final_version'::text,
    'pdf_draft'::text,
    'locked_pending_screening'::text,
    'under_review'::text,
    'published'::text,
    'removed'::text,
    'suspended_pending_verification'::text,
    'revision_requested'::text,
    'revision_pending_review'::text,
    'revision_overdue'::text
  ]));

ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS reporter_email text,
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS appeal_status text,
  ADD COLUMN IF NOT EXISTS appeal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_reason text,
  ADD COLUMN IF NOT EXISTS biography_status_before_decision text;

COMMENT ON COLUMN public.moderation_reports.reporter_email IS
  'Email di chi ha segnalato senza account. Per le segnalazioni in app si usa reporter_id.';

COMMENT ON COLUMN public.moderation_reports.origin IS
  'in_app, email_channel o screening. NULL sulle pratiche aperte prima di questa colonna.';

COMMENT ON COLUMN public.moderation_reports.appeal_status IS
  'Ricorso dell''autore sul report: pending, upheld, rejected. Non cambia lo stato della biografia finché non è deciso.';

ALTER TABLE public.moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_origin_check;
ALTER TABLE public.moderation_reports
  ADD CONSTRAINT moderation_reports_origin_check
  CHECK (origin IS NULL OR origin = ANY (ARRAY[
    'in_app'::text,
    'email_channel'::text,
    'screening'::text
  ]));

ALTER TABLE public.moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_appeal_status_check;
ALTER TABLE public.moderation_reports
  ADD CONSTRAINT moderation_reports_appeal_status_check
  CHECK (appeal_status IS NULL OR appeal_status = ANY (ARRAY[
    'pending'::text,
    'upheld'::text,
    'rejected'::text
  ]));

ALTER TABLE public.moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_biography_status_before_decision_check;
ALTER TABLE public.moderation_reports
  ADD CONSTRAINT moderation_reports_biography_status_before_decision_check
  CHECK (
    biography_status_before_decision IS NULL
    OR biography_status_before_decision = ANY (ARRAY[
      'draft'::text,
      'sections_complete'::text,
      'final_version'::text,
      'pdf_draft'::text,
      'locked_pending_screening'::text,
      'under_review'::text,
      'published'::text,
      'removed'::text,
      'suspended_pending_verification'::text,
      'revision_requested'::text,
      'revision_pending_review'::text,
      'revision_overdue'::text
    ])
  );

ALTER TABLE public.moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_report_type_check;
ALTER TABLE public.moderation_reports
  ADD CONSTRAINT moderation_reports_report_type_check
  CHECK (report_type = ANY (ARRAY[
    'level1_content'::text,
    'level2_content'::text,
    'level3_content'::text,
    'user_report'::text,
    'living_person'::text,
    'right_to_oblivion'::text,
    'impersonation'::text,
    'copyright'::text,
    'other'::text,
    'illegal_content'::text,
    'sensitive_personal_data'::text,
    'defamation'::text
  ]));
