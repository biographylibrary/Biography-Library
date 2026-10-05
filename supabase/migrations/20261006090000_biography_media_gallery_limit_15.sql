/*
  # Le foto di galleria di una biografia scendono da 30 a 15

  Decisione di prodotto: la galleria di una biografia ha al massimo 15 foto (cover e cover_a5
  non contano). Il limite sta in due punti che devono dire lo stesso numero: la costante
  `MAX_BIOGRAPHY_GALLERY_PHOTOS` (`lib/biography-media-constants.ts`), da cui l'interfaccia
  ricava il contatore «4/15» e il blocco del caricamento, e questo controllo nel database, che
  è l'ultima difesa. Un test (`lib/__tests__/gallery-limit-consistency.test.ts`) fa fallire la
  verifica automatica se i due numeri, o le frasi delle guide che li citano, non coincidono.

  ## Che cosa cambia
  Solo il numero nel corpo della funzione `check_biography_media_limit` (da 30 a 15) e nel suo
  messaggio. Il trigger che la chiama (BEFORE INSERT su `biography_media`) non cambia, e nemmeno
  i permessi o `search_path`.

  ## Dati esistenti
  Controllato in produzione il 6 ottobre 2026: nessuna biografia ha più di 10 foto in galleria
  (61 foto di galleria in tutto), quindi nessuna supera il nuovo limite. In ogni caso il
  controllo scatta solo sull'inserimento di una riga nuova: una biografia che avesse già più di
  15 foto le terrebbe, non potrebbe aggiungerne altre, e modificare didascalie o ordine di
  quelle esistenti (UPDATE) non è toccato.

  ## Ritorno indietro
  Rimettere 30 con la stessa istruzione (vedi 20260625120000_biography_media_gallery_limit_30.sql).
*/

CREATE OR REPLACE FUNCTION public.check_biography_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.layout IN ('cover', 'cover_a5') THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.biography_media
    WHERE biography_id = NEW.biography_id
      AND layout NOT IN ('cover', 'cover_a5')
  ) >= 15 THEN
    RAISE EXCEPTION 'A biography may have at most 15 gallery photos.';
  END IF;

  RETURN NEW;
END;
$$;
