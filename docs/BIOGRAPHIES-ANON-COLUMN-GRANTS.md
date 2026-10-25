# Lettura anonima di `public.biographies`: permessi a colonna

Migrazione: `supabase/migrations/20261025120000_biographies_anon_column_grants.sql`  
Progetto produzione: Zurigo `frycyhvhuifznxzamenn` (non applicare su Irlanda).

## Motivo

Il ruolo `anon` aveva `GRANT ALL` sulla tabella: un visitatore poteva chiedere colonne interne (`user_id`, `share_token`, `ai_screening_status`, feedback di screening, diritti, flag email, …) sulle biografie che la RLS pubblica già espone (published + public). La RLS decide *quali righe*; i privilegi di colonna decidono *quali campi*.

## Colonne leggibili da `anon`

`id`, `title`, `subject_name`, `author_name`, `biography_type`, `biography_mode`, `content`, `content_freeflow`, `record_language_tag`, `record_script`, `record_direction`, `um_id`, `slug`, `status`, `visibility`, `translation_of`, `published_at`, `created_at`, `provisional_until`, `is_pioneer`, `is_frozen`, `frozen_at`, `chapters_count`, `view_count`, `is_featured`, `featured_at`, `listing_cover_url`, `export_txt_url`, `export_docx_url`, `final_pdf_url`.

Tutto il resto resta inaccessibile ad `anon` (incluso `SELECT *`, che fallisce con SQLSTATE `42501` — comportamento atteso).

`authenticated` e `service_role` non sono toccati.

## Regola per le colonne nuove

Ogni nuova colonna letta da una pagina o query pubblica (catalogo, view, metadata hreflang, read-in-switcher) va:

1. aggiunta al `GRANT SELECT (…)` della migrazione (o di una migrazione successiva dedicata);
2. esportata nelle costanti di select/filtro (`PUBLISHED_SELECT`, `PUBLIC_EDITIONS_SELECT`, `PUBLIC_VIEW_SELECT`, `EDITION_VIEW_METADATA_SELECT`, `PUBLIC_BIOGRAPHY_FILTER_COLUMNS`);
3. coperta dal test `lib/server/__tests__/db/biographies-anon-columns.test.ts` (coverage GRANT).

## Vista `biography_flat`

Non usata dall’applicazione né dagli script operativi (solo test storici). `REVOKE ALL … FROM anon` sulla vista. Ricostruzione da `supabase/baseline/` riflette lo stesso.

## Rollback

Su Zurigo, solo se necessario e con conferma esplicita:

```sql
GRANT SELECT ON TABLE public.biographies TO anon;
GRANT SELECT ON TABLE public.biography_flat TO anon;
```

Questo ripristina la lettura di tutte le colonne (e della vista) per `anon`; non ripristina INSERT/UPDATE/DELETE se erano stati revocati insieme al `REVOKE ALL` della migrazione. Per un rollback completo dei soli SELECT a colonna, il `GRANT SELECT` sulla tabella è sufficiente per la lettura.
