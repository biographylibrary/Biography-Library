import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BETA_LOGIN_NOTICE_KEY,
  clearBetaLoginNotice,
  hasBetaLoginNotice,
  markBetaLoginNotice,
} from '@/lib/beta-login-notice';

describe('beta login notice', () => {
  const store = new Map<string, string>();

  afterEach(() => {
    store.clear();
    vi.unstubAllGlobals();
  });

  it('is marked only until it is cleared', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    sessionStorage.removeItem(BETA_LOGIN_NOTICE_KEY);
    expect(hasBetaLoginNotice()).toBe(false);
    markBetaLoginNotice();
    expect(hasBetaLoginNotice()).toBe(true);
    clearBetaLoginNotice();
    expect(hasBetaLoginNotice()).toBe(false);
  });
});
