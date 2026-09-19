/*
  # Vista piatta biografia + nascita/morte da person_events

  Permette all'app di leggere nascita/morte come colonne derivate senza
  abbandonare il modello a eventi. security_invoker = on: la RLS delle
  tabelle sottostanti resta in vigore.
*/

CREATE OR REPLACE VIEW public.biography_flat
  WITH (security_invoker = on)
AS
SELECT
  b.*,
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
