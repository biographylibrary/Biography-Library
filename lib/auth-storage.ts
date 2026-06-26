/** Best-effort removal of persisted Supabase auth tokens from localStorage. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const ref = new URL(url).hostname.split('.')[0];
      if (ref) {
        localStorage.removeItem(`sb-${ref}-auth-token`);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.removeItem('bl_auth_notice');
  } catch {
    /* ignore */
  }
}

export function redirectAfterSignOut(): void {
  if (typeof window === 'undefined') return;
  window.location.assign('/?signedOut=1');
}
