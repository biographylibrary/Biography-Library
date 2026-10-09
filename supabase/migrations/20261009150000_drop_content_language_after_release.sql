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
  ricrea. In produzione la vista aveva tutti i privilegi per anon e
  authenticated; dopo la ricreazione resta solo SELECT per anon,
  authenticated e service_role.
*/

DROP VIEW IF EXISTS public.biography_flat;

ALTER TABLE public.biographies
  DROP COLUMN IF EXISTS content_language;

DO $rebuild$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(piece, ', ' ORDER BY ordinal_position)
    INTO cols
  FROM (
    SELECT ordinal_position,
           CASE
             WHEN column_name = 'record_direction'
               THEN 'b.record_direction, b.translation_of'
             ELSE 'b.' || quote_ident(column_name)
           END AS piece
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'biographies'
      AND column_name <> 'content_language'
      AND column_name <> 'translation_of'
  ) listed;

  EXECUTE
    'CREATE VIEW public.biography_flat WITH (security_invoker = on) AS SELECT '
    || cols
    || ', birth.date_edtf AS birth_date_edtf'
    || ', birth.date_as_given AS birth_date_as_given'
    || ', birth.date_start_iso AS birth_date_start_iso'
    || ', birth.date_start_jdn AS birth_date_start_jdn'
    || ', birth.place_name_as_given AS birth_place_as_given'
    || ', birth.place_lat AS birth_place_lat'
    || ', birth.place_lon AS birth_place_lon'
    || ', death.date_edtf AS death_date_edtf'
    || ', death.date_as_given AS death_date_as_given'
    || ', death.date_start_iso AS death_date_start_iso'
    || ', death.date_start_jdn AS death_date_start_jdn'
    || ', death.place_name_as_given AS death_place_as_given'
    || ', death.place_lat AS death_place_lat'
    || ', death.place_lon AS death_place_lon'
    || ' FROM public.biographies b'
    || ' LEFT JOIN LATERAL ('
    || '   SELECT * FROM public.person_events e'
    || '   WHERE e.biography_id = b.id AND e.event_type = ''birth'''
    || '   ORDER BY e.sequence ASC, e.created_at ASC LIMIT 1'
    || ' ) birth ON true'
    || ' LEFT JOIN LATERAL ('
    || '   SELECT * FROM public.person_events e'
    || '   WHERE e.biography_id = b.id AND e.event_type = ''death'''
    || '   ORDER BY e.sequence ASC, e.created_at ASC LIMIT 1'
    || ' ) death ON true';
END
$rebuild$;

COMMENT ON VIEW public.biography_flat IS
  'Vista piatta: nascita/morte derivate da person_events. security_invoker on.';

REVOKE ALL ON TABLE public.biography_flat FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.biography_flat TO anon, authenticated, service_role;
