import { describe, expect, it } from 'vitest';
import {
  classifyGrantTarget,
  chunkIds,
  GRANT_ACCESS_BATCH_SIZE,
  postLoginPath,
  shouldHoldOnWaitlist,
} from '@/lib/waitlist';

describe('shouldHoldOnWaitlist', () => {
  it('holds waitlist users off dashboard, editor, home, and login', () => {
    const base = { accountStatus: 'waitlist', role: 'user' as const };
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/dashboard' })).toBe(true);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/biography/abc/edit' })).toBe(true);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/onboarding' })).toBe(true);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/' })).toBe(true);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/login' })).toBe(true);
  });

  it('lets waitlist users stay on holding, catalogue, resolver, and legal pages', () => {
    const base = { accountStatus: 'waitlist', role: 'user' as const };
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/waitlist' })).toBe(false);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/biographies' })).toBe(false);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/id/UM-0000-1D57-F89R-7C6N' })).toBe(false);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/biography/abc/view' })).toBe(false);
    expect(shouldHoldOnWaitlist({ ...base, pathname: '/privacy-policy' })).toBe(false);
  });

  it('does not hold staff or active accounts', () => {
    expect(
      shouldHoldOnWaitlist({ accountStatus: 'waitlist', role: 'admin', pathname: '/dashboard' })
    ).toBe(false);
    expect(
      shouldHoldOnWaitlist({ accountStatus: 'active', role: 'user', pathname: '/dashboard' })
    ).toBe(false);
  });
});

describe('postLoginPath', () => {
  it('sends waitlist users to holding and everyone else to the dashboard', () => {
    expect(postLoginPath({ accountStatus: 'waitlist', role: 'user' })).toBe('/waitlist');
    expect(postLoginPath({ accountStatus: 'waitlist', role: 'reviewer' })).toBe('/dashboard');
    expect(postLoginPath({ accountStatus: 'active', role: 'user' })).toBe('/dashboard');
  });
});

describe('classifyGrantTarget', () => {
  it('grants waitlist, skips active, skips everything else', () => {
    expect(classifyGrantTarget('waitlist')).toBe('grant');
    expect(classifyGrantTarget('active')).toBe('skip_active');
    expect(classifyGrantTarget('suspended')).toBe('skip_other');
    expect(classifyGrantTarget(null)).toBe('skip_other');
  });
});

describe('chunkIds', () => {
  it('splits into batches of 100', () => {
    const ids = Array.from({ length: 250 }, (_, i) => String(i));
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(GRANT_ACCESS_BATCH_SIZE);
    expect(chunks[2]).toHaveLength(50);
  });
});
