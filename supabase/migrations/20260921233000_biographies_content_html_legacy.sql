/*
  # biographies.content_html_legacy

  Conserva l’HTML originale prima della conversione in Markdown d’archivio.
  È un’istantanea jsonb (campi che erano HTML), non il testo di lettura.
  Nullable: le schede già in Markdown restano con NULL.

  Lo script di prova non scrive questa colonna. La scrive solo --apply,
  e non sulle schede pubblicate dove la conversione perde testo o formattazione.
*/

ALTER TABLE public.biographies
  ADD COLUMN IF NOT EXISTS content_html_legacy jsonb;

COMMENT ON COLUMN public.biographies.content_html_legacy IS
  'Istantanea dell''HTML originale prima della conversione Markdown. Non è il testo di lettura.';
