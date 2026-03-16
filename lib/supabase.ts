import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const COOKIE_NAME = 'sb-gckmusbozgbclokvbnwx-auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

const cookieStorage = {
  getItem: (key: string): string | null => {
    return getCookie(key) ?? localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, value);
    if (key === COOKIE_NAME) {
      setCookie(key, value);
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    if (key === COOKIE_NAME) {
      deleteCookie(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? cookieStorage : undefined,
    storageKey: COOKIE_NAME,
  },
});
