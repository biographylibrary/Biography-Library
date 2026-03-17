import { supabase } from './supabase';

export async function getFreshAccessToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Session error:', error);
    return null;
  }

  if (!session?.access_token) {
    return null;
  }

  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const bufferSec = 60;

  if (expiresAt - nowSec < bufferSec) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Session refresh error:', refreshError);
      return null;
    }
    return refreshed.session?.access_token || null;
  }

  return session.access_token;
}

export async function ensureValidSession(): Promise<string> {
  const token = await getFreshAccessToken();

  if (!token) {
    throw new Error('No valid session found. Please refresh the page and try again.');
  }

  return token;
}
