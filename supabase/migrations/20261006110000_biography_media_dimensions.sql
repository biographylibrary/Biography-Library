/*
  # Dimensioni delle foto in biography_media

  Quattro colonne nuove, tutte facoltative, scritte dal server quando elabora una foto
  (rotta POST /api/biography/[id]/media, lib/server/photo-processing.ts):

    width, height   pixel del file salvato (dopo l'orientamento e il ridimensionamento)
    bytes           dimensione del file salvato
    original_bytes  dimensione del file di partenza, prima della compressione

  Le righe esistenti restano con valori nulli finché lo script scripts/recompress-photos.ts non le
  ricomprime: nulli significa «non ancora elaborata dal server».

  ## Perché sono nulli ammessi
  Aggiunge colonne, non toglie né cambia nulla: il vecchio codice, che non le conosce, continua a
  funzionare, quindi questa migrazione va applicata PRIMA del deploy della rotta nuova.

  ## Limite noto
  Le policy di biography_media consentono al proprietario di scrivere le proprie righe: potrebbe
  dunque scrivere valori falsi in queste colonne. Sono informazioni di servizio (non decidono nulla
  di sicuro), ma la porta più larga, la scrittura diretta di file_url, è descritta nel resoconto.

  ## Ritorno indietro
  ALTER TABLE public.biography_media DROP COLUMN width, DROP COLUMN height, DROP COLUMN bytes,
  DROP COLUMN original_bytes;
*/

ALTER TABLE public.biography_media
  ADD COLUMN IF NOT EXISTS width integer CHECK (width IS NULL OR width > 0),
  ADD COLUMN IF NOT EXISTS height integer CHECK (height IS NULL OR height > 0),
  ADD COLUMN IF NOT EXISTS bytes integer CHECK (bytes IS NULL OR bytes > 0),
  ADD COLUMN IF NOT EXISTS original_bytes integer CHECK (original_bytes IS NULL OR original_bytes > 0);
