import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, any, any>;

export function buildAnonClient(jwt: string): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as AnyClient;
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return { error: 'Authentication required' as const, status: 401 as const };

  const anonClient = buildAnonClient(jwt);
  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' as const, status: 401 as const };
  }

  return { user, anonClient };
}
