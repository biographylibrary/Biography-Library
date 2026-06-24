import { describe, expect, it } from 'vitest';
import {
  echoStorageTypesForLookup,
  isEchoAgentType,
  LEGACY_ECHO_STORAGE_TYPE,
  threadAgentTypeForStorage,
} from '@/lib/agents/echo-thread-storage';

describe('echo-thread-storage', () => {
  it('stores agent types unchanged', () => {
    expect(threadAgentTypeForStorage('echo')).toBe('echo');
    expect(threadAgentTypeForStorage('biography_coach')).toBe('biography_coach');
  });

  it('identifies echo agent type', () => {
    expect(isEchoAgentType('echo')).toBe(true);
    expect(isEchoAgentType('platform_guide')).toBe(false);
  });

  it('includes legacy platform_guide type in echo lookup list', () => {
    expect(echoStorageTypesForLookup()).toEqual(['echo', LEGACY_ECHO_STORAGE_TYPE]);
  });
});
