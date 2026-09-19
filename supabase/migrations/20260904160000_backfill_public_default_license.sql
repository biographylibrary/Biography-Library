/*
  # Backfill licenza default sulle biografie pubbliche preesistenti

  Le 8 schede demo/public create prima del trigger diritti non hanno
  rights_statement_uri. Assegna CC BY-NC-SA 4.0 (scelta predefinita) e
  marca rights_chosen_at. Non tocca schede già con licenza.
*/

UPDATE public.biographies
SET
  rights_statement_uri = 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  rights_chosen_at = COALESCE(rights_chosen_at, now()),
  rights_holder = COALESCE(
    NULLIF(BTRIM(rights_holder), ''),
    NULLIF(BTRIM(author_name), ''),
    NULLIF(BTRIM(name_as_written), ''),
    NULLIF(BTRIM(title), '')
  )
WHERE visibility = 'public'
  AND COALESCE(BTRIM(rights_statement_uri), '') = '';

COMMENT ON COLUMN public.biographies.rights_statement_uri IS
  'URI licenza scelta dall''autore. Obbligatoria per visibility=public. Default storico backfill: CC BY-NC-SA 4.0.';
