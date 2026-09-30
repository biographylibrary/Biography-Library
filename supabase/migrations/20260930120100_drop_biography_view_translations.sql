/*
  # Eliminazione di biography_view_translations

  La traduzione automatica per i lettori è stata tolta (rotta translate-view,
  available-languages e libreria). Le traduzioni le farà l'autore, in un blocco
  successivo, con un modello dati proprio (edizioni). La tabella conteneva solo
  copie derivate, rigenerabili: nessun dato dell'autore.
*/

DROP TABLE IF EXISTS public.biography_view_translations;
