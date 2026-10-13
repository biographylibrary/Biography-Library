/*
  # Motivo edition_published sulle versioni d'archivio

  Una traduzione pubblicata dopo la v1 dell'originale crea una nuova versione
  del pacchetto dell'originale (stesso um_id, stesso biography_id). L'edizione
  non ha un pacchetto proprio né un identificativo UM.
*/

ALTER TABLE public.archive_package_versions
  DROP CONSTRAINT IF EXISTS archive_package_versions_reason_check;

ALTER TABLE public.archive_package_versions
  ADD CONSTRAINT archive_package_versions_reason_check
  CHECK (reason IN (
    'publication',
    'provisional_expired',
    'republication',
    'data_protection',
    'edition_published'
  ));
