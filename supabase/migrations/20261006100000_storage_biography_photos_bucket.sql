/*
  # Il bucket delle foto e le sue regole entrano nel repository

  Il bucket `biography-photos` è l'unico dei tre (con `archive` e `biography-exports`) che era stato
  configurato a mano dal pannello e non era descritto da nessuna migrazione. Questa migrazione lo
  descrive esattamente com'è in produzione, SENZA cambiare nessun comportamento: il repository deve
  dire cos'è la produzione prima che la si modifichi (vedi 20261006120000_storage_biography_photos_server_only_writes.sql).

  ## Come è in produzione (letto il 6 ottobre 2026 da storage.buckets e pg_policies)
  Bucket: id e nome `biography-photos`, privato (`public = false`), nessun limite di dimensione
  (`file_size_limit` nullo), nessun elenco di tipi ammessi (`allowed_mime_types` nullo),
  `avif_autodetection = false`, tipo STANDARD.

  Quattro policy su `storage.objects`, tutte per il ruolo `authenticated` e tutte con la stessa
  condizione: il bucket è `biography-photos` e la prima cartella del percorso è l'identificativo
  dell'utente (`(storage.foldername(name))[1] = auth.uid()::text`), cioè ognuno tocca solo la
  propria cartella:
    - "Users can upload to own folder"  INSERT  (WITH CHECK)
    - "Users can read own files"        SELECT  (USING)
    - "Users can update own files"      UPDATE  (USING e WITH CHECK)
    - "Users can delete own files"      DELETE  (USING)
  Le foto si leggono dal browser con indirizzi firmati (`createSignedUrl`), e il PDF e le pagine
  pubbliche le leggono dal server con il ruolo di servizio.

  ## Come è scritta
  Ogni elemento si crea solo se manca (`ON CONFLICT DO NOTHING`, controllo su `pg_policies`): in
  produzione, dove esiste già, non succede nulla; su un database nuovo (un ambiente di prova, la
  migrazione verso un altro servizio) si ottiene lo stesso bucket e le stesse regole. Non si usa
  DROP e CREATE: non c'è nessun istante in cui una policy manca. Il test del banco
  (lib/server/__tests__/db/storage-photos.test.ts) confronta le definizioni create con quelle di
  produzione, carattere per carattere.

  ## Ritorno indietro
  Non serve: non cambia nulla dove l'elemento esiste già.
*/

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('biography-photos', 'biography-photos', false, false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload to own folder'
  ) THEN
    CREATE POLICY "Users can upload to own folder" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can read own files'
  ) THEN
    CREATE POLICY "Users can read own files" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own files'
  ) THEN
    CREATE POLICY "Users can update own files" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text)
      WITH CHECK (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own files'
  ) THEN
    CREATE POLICY "Users can delete own files" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'biography-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
  END IF;
END
$$;
