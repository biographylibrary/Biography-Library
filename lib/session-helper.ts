import { supabase } from './supabase';

export async function getFreshAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function ensureValidSession(): Promise<string> {
  const token = await getFreshAccessToken();

  if (!token) {
    throw new Error('No valid session found. Please refresh the page and try again.');
  }

  return token;
}
