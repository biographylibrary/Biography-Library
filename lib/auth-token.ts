import { supabase } from '@/lib/supabase';
import { clearSupabaseAuthStorage } from '@/lib/auth-storage';

export function isAuthenticationRequiredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('authentication required') ||
    lower.includes('session_expired') ||
    lower.includes('token_expired') ||
    lower.includes('jwt expired')
  );
}

/** Clears broken local auth and sends the user to the login screen. */
export function invalidateLocalAuthSession(reason: 'signed_out' | 'session_expired' = 'session_expired'): void {
  if (typeof window === 'undefined') return;
  clearSupabaseAuthStorage();
  void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  const param = reason === 'signed_out' ? 'signedOut=1' : 'session_expired=1';
  window.location.assign(`/?${param}`);
}

/** Fresh JWT from Supabase storage, validated with getUser and refreshed when needed. */
export async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) return null;

  const expiresAt = session.expires_at ?? 0;
  const nowSecs = Math.floor(Date.now() / 1000);
  const needsRefresh = expiresAt - nowSecs < 300;

  let accessToken = session.access_token;

  if (needsRefresh) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      accessToken = refreshed.session.access_token;
    } else {
      const {
        data: { session: freshSession },
      } = await supabase.auth.getSession();
      if (
        !freshSession?.access_token ||
        !freshSession.expires_at ||
        freshSession.expires_at <= nowSecs
      ) {
        return null;
      }
      accessToken = freshSession.access_token;
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
    return null;
  }

  return accessToken;
}

/** Agent API fetch with token refresh + one 401 retry. */
export async function fetchWithAgentAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let token = await getValidAccessToken();
  if (!token) {
    invalidateLocalAuthSession('session_expired');
    throw new Error('Authentication required');
  }

  const withAuth = (jwt: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${jwt}`);
    return fetch(input, { ...init, headers });
  };

  let res = await withAuth(token);
  if (res.status !== 401) return res;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    token = refreshed.session.access_token;
  } else {
    token = (await getValidAccessToken()) ?? null;
  }

  if (!token) {
    invalidateLocalAuthSession('session_expired');
    throw new Error('Authentication required');
  }

  res = await withAuth(token);
  if (res.status === 401) {
    invalidateLocalAuthSession('session_expired');
    throw new Error('Authentication required');
  }

  return res;
}
