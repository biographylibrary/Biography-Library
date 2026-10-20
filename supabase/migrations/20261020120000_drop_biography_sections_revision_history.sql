-- Campo morto, rimosso prima del trasferimento a Zurigo.
alter table public.biography_sections drop column if exists revision_history;
