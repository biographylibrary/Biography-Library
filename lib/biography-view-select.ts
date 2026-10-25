/**
 * Select stringhe per la pagina di lettura pubblica.
 * PUBLIC_VIEW_SELECT: ruolo anon (niente share_token né colonne interne).
 * BIOGRAPHY_VIEW_SELECT: sessione autenticata owner/staff.
 * Ogni colonna in PUBLIC_VIEW_SELECT deve essere nel GRANT di
 * 20261025120000_biographies_anon_column_grants.sql.
 */

export const PUBLIC_VIEW_SELECT =
  'id, title, subject_name, biography_type, author_name, um_id, content, content_freeflow, biography_mode, visibility, status, created_at, published_at, provisional_until, is_pioneer, is_frozen, frozen_at, export_txt_url, export_docx_url, listing_cover_url, record_language_tag, record_script, record_direction, translation_of, final_pdf_url';

export const BIOGRAPHY_VIEW_SELECT = `${PUBLIC_VIEW_SELECT}, share_token`;
