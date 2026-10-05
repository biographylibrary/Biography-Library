-- Ritorno indietro di 20261006120000_storage_biography_photos_server_only_writes.sql.
-- Da usare solo se, dopo averla applicata, il caricamento delle foto dal server non funziona e serve
-- far tornare il browser a scrivere direttamente nel bucket (con il pannello foto del codice vecchio).
-- NON si applica da solo. Una transazione: o tutto o niente.

BEGIN;

CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

UPDATE storage.buckets SET file_size_limit = NULL WHERE id = 'biography-photos';

COMMIT;
