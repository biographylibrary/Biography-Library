/*
  # DOPO IL RILASCIO — non applicare insieme a 20261009143000

  Si applica a mano solo quando sono già in produzione:
  - 20261009143000_biography_editions.sql
  - il codice che non legge più content_language
  - la Edge Function send-engagement-emails aggiornata

  Nello stesso deploy togliere la chiave `biographies.content_language`
  da NON_PUBLIC_TEXT_COLUMNS in lib/server/screening-public-text.ts.
  Se la si toglie mentre la colonna c'è ancora, il test di allineamento
  fallisce: la colonna text resta non classificata. L'ordine reale è
  prima il codice (voce ancora presente), poi questa migrazione.

  La vista public.biography_flat (20260904090400) legge b.content_language.
  CREATE OR REPLACE non può togliere una colonna di vista: si droppa e si
  ricrea. L'elenco è quello che la vista espone oggi, non quello della
  tabella al momento dell'esecuzione: senza content_language, con
  translation_of subito dopo record_direction, e senza le quattro colonne
  che la tabella ha in più e che la vista non ha mai pubblicato
  (content_html_legacy, provisional_until, revised_at, is_pioneer).
  In produzione la vista aveva tutti i privilegi per anon e
  authenticated; dopo la ricreazione resta solo SELECT per anon,
  authenticated e service_role.
*/

DROP VIEW IF EXISTS public.biography_flat;

ALTER TABLE public.biographies
  DROP COLUMN IF EXISTS content_language;

CREATE VIEW public.biography_flat
  WITH (security_invoker = on)
AS
SELECT
  b.id,
  b.user_id,
  b.title,
  b.content,
  b.visibility,
  b.status,
  b.created_at,
  b.updated_at,
  b.share_token,
  b.completed_at,
  b.editor_font_size,
  b.final_version,
  b.narrative_order,
  b.published_at,
  b.author_name,
  b.frozen_at,
  b.frozen_reason,
  b.last_chapter_published_at,
  b.next_chapter_available_at,
  b.chapters_count,
  b.linked_biography_ids,
  b.is_frozen,
  b.view_count,
  b.is_featured,
  b.featured_at,
  b.featured_by,
  b.biography_mode,
  b.content_freeflow,
  b.biography_type,
  b.slug,
  b.ai_screening_status,
  b.pdf_draft_iteration,
  b.reviewed_by,
  b.reviewed_at,
  b.export_txt_url,
  b.export_docx_url,
  b.pdf_draft_started_at,
  b.final_pdf_approved_at,
  b.final_pdf_url,
  b.listing_cover_url,
  b.draft_ai_feedback,
  b.chapter_available_email_sent_at,
  b.pdf_draft_reminder_sent_at,
  b.subject_name,
  b.um_id,
  b.schema_version,
  b.record_language_tag,
  b.record_script,
  b.record_direction,
  b.translation_of,
  b.record_language_endonym,
  b.name_as_written,
  b.name_given,
  b.name_family,
  b.name_order,
  b.name_romanized,
  b.romanization_system,
  b.published_at_iso,
  b.published_um_year,
  b.rights_statement_uri,
  b.rights_chosen_at,
  b.rights_holder,
  b.consent_basis,
  b.consent_recorded_at,
  birth.date_edtf AS birth_date_edtf,
  birth.date_as_given AS birth_date_as_given,
  birth.date_start_iso AS birth_date_start_iso,
  birth.date_start_jdn AS birth_date_start_jdn,
  birth.place_name_as_given AS birth_place_as_given,
  birth.place_lat AS birth_place_lat,
  birth.place_lon AS birth_place_lon,
  death.date_edtf AS death_date_edtf,
  death.date_as_given AS death_date_as_given,
  death.date_start_iso AS death_date_start_iso,
  death.date_start_jdn AS death_date_start_jdn,
  death.place_name_as_given AS death_place_as_given,
  death.place_lat AS death_place_lat,
  death.place_lon AS death_place_lon
FROM public.biographies b
LEFT JOIN LATERAL (
  SELECT *
  FROM public.person_events e
  WHERE e.biography_id = b.id AND e.event_type = 'birth'
  ORDER BY e.sequence ASC, e.created_at ASC
  LIMIT 1
) birth ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM public.person_events e
  WHERE e.biography_id = b.id AND e.event_type = 'death'
  ORDER BY e.sequence ASC, e.created_at ASC
  LIMIT 1
) death ON true;

COMMENT ON VIEW public.biography_flat IS
  'Vista piatta: nascita/morte derivate da person_events. security_invoker on.';

REVOKE ALL ON TABLE public.biography_flat FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.biography_flat TO anon, authenticated, service_role;
