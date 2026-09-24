export const BETA_LOGIN_NOTICE_KEY = 'bl_beta_login_notice';

/** Call only after a successful sign-in, not on a page reload. */
export function markBetaLoginNotice(): void {
  try {
    sessionStorage.setItem(BETA_LOGIN_NOTICE_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function hasBetaLoginNotice(): boolean {
  try {
    return sessionStorage.getItem(BETA_LOGIN_NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearBetaLoginNotice(): void {
  try {
    sessionStorage.removeItem(BETA_LOGIN_NOTICE_KEY);
  } catch {
    /* private mode */
  }
}
