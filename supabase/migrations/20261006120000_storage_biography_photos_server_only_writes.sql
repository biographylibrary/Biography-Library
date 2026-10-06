/*
  # Le foto si scrivono solo dal server

  Da quando il caricamento passa dalla rotta POST /api/biography/[id]/media (controlli, elaborazione
  con sharp, scrittura con il ruolo di servizio), la porta laterale va chiusa: un utente autenticato
  non deve più poter scrivere né sovrascrivere file nel bucket `biography-photos` direttamente dal
  browser, perché così aggirerebbe il limite di quindici foto, il controllo del tipo, la
  compressione e l'eliminazione dei metadati (posizione GPS compresa).

  ## Che cosa cambia
  1. Si tolgono due policy di `storage.objects` per `authenticated`:
       "Users can upload to own folder"   (INSERT)
       "Users can update own files"       (UPDATE)
  2. Si fissa sul bucket un limite di dimensione di 20 MiB (20971520 byte) per file: è lo stesso
     massimo che la rotta accetta in ingresso (MAX_UPLOAD_BYTES in lib/server/photo-processing.ts) e
     che il pannello foto annuncia, quindi «20 MB per immagine» vale in tutti e tre i punti. Fa da
     seconda difesa: un file elaborato (JPEG, lato lungo al massimo 3100 pixel, qualità 85) sta di
     norma fra uno e quattro megabyte, e questo limite ferma qualunque altro scrittore. Vale anche per
     il ruolo di servizio (è il bucket a rifiutare). Il limite riguarda solo i file nuovi: i file già
     nel bucket non cambiano e non vanno ricompressi (decisione del 6 ottobre 2026).

  ## Che cosa NON cambia
  La lettura (policy "Users can read own files") e la cancellazione dei propri file (policy "Users can
  delete own files": il pannello foto rimuove da sé i file che toglie). Il server scrive con il
  ruolo di servizio, che non passa dalle policy.

  ## Quando applicarla
  DOPO il deploy della rotta e del pannello foto nuovo: il pannello vecchio carica direttamente nel
  bucket e smetterebbe di funzionare. La migrazione 20261006110000_biography_media_dimensions.sql
  (le colonne) va applicata prima del deploy.

  ## Ritorno indietro
  supabase/rollback/20261006_storage_biography_photos_rollback.sql ricrea le due policy come erano
  e toglie il limite di dimensione.
*/

DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

UPDATE storage.buckets
SET file_size_limit = 20971520
WHERE id = 'biography-photos';
