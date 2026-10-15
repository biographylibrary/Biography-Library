-- ============================================================================
-- profiles.ai_features_enabled — solo server
-- ============================================================================
-- La preferenza si cambia solo via POST /api/profile/ai-features (service_role),
-- che spegne il flag e poi cancella la memoria Echo. Il browser non deve più
-- poterlo scrivere con un UPDATE diretto su profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.profiles_server_owned_columns()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'id', 'created_at',
    'role', 'account_status', 'waitlist_granted_at',
    'legal_declaration_accepted_at', 'legal_declaration_type', 'legal_declaration_version',
    'welcome_email_sent_at',
    'ai_features_enabled'
  ]::text[];
$$;

-- All'INSERT il default di colonna è false: deve coincidere con la mappa del guard
-- (altrimenti anche un insert senza la colonna esplicita viene rifiutato).
CREATE OR REPLACE FUNCTION public.profiles_insert_defaults()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'role', 'user',
    'account_status', 'waitlist',
    'ai_features_enabled', false
  );
$$;

COMMENT ON FUNCTION public.profiles_server_owned_columns() IS
  'Colonne di profiles riservate al server (ruolo servizio). Include ai_features_enabled.';

-- CREATE OR REPLACE può ripristinare la configurazione: rifissa search_path vuoto
-- come in 20260930120300_helper_functions_search_path.sql.
ALTER FUNCTION public.profiles_server_owned_columns() SET search_path = '';
ALTER FUNCTION public.profiles_insert_defaults() SET search_path = '';
