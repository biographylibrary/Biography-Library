import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type AnyClient = SupabaseClient<any, any, any>;

/** Client con il ruolo di servizio: bypassa RLS. Solo codice server. */
export function buildServiceClient(): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } }) as AnyClient;
}
