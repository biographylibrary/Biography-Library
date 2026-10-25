-- Column-level SELECT for anon on public.biographies.
-- Catalogo, lettura pubblica, share-link (RPC) e cambio edizione restano
-- funzionanti; colonne interne (user_id, share_token, screening, …) non sono
-- più leggibili dal ruolo anonimo. authenticated e service_role non cambiano.
--
-- SELECT * da anon fallisce con 42501 (atteso): PostgREST/client devono
-- elencare colonne esplicite, come già fanno le pagine pubbliche.
--
-- biography_flat (security_invoker) non è usata dall'app: REVOKE SELECT da anon.

REVOKE ALL ON TABLE public.biographies FROM anon;

GRANT SELECT (
  id,
  title,
  subject_name,
  author_name,
  biography_type,
  biography_mode,
  content,
  content_freeflow,
  record_language_tag,
  record_script,
  record_direction,
  um_id,
  slug,
  status,
  visibility,
  translation_of,
  published_at,
  created_at,
  provisional_until,
  is_pioneer,
  is_frozen,
  frozen_at,
  chapters_count,
  view_count,
  is_featured,
  featured_at,
  listing_cover_url,
  export_txt_url,
  export_docx_url,
  final_pdf_url
) ON TABLE public.biographies TO anon;

REVOKE ALL ON TABLE public.biography_flat FROM anon;
-- authenticated e service_role restano con SELECT sulla vista (invariati).
