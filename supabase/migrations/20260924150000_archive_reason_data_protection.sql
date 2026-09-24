/*
  # Motivo data_protection sulle versioni d'archivio

  erasePriorContent segna la versione distrutta con questo motivo.
  Lo stato destroyed c'era già.
*/

ALTER TABLE public.archive_package_versions
  DROP CONSTRAINT IF EXISTS archive_package_versions_reason_check;

ALTER TABLE public.archive_package_versions
  ADD CONSTRAINT archive_package_versions_reason_check
  CHECK (reason IN ('publication', 'provisional_expired', 'republication', 'data_protection'));
