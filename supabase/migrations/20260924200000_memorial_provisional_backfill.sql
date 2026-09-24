/*
  # Finestra memorial già pubblicate

  Le autobiografie restano con provisional_until vuoto.
  I memoriali già pubblicati ricevono published_at + 30 giorni, una volta sola.
  Se quella data è già passata, la marcatura non compare: il confronto è sulla data.
*/

UPDATE public.biographies
SET provisional_until = published_at + interval '30 days'
WHERE biography_type = 'memorial'
  AND published_at IS NOT NULL
  AND provisional_until IS NULL;
