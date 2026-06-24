import type { AgentType } from '@/lib/agents/models';

/** Legacy: Echo threads were stored as platform_guide before echo agent type migration. */
export const LEGACY_ECHO_STORAGE_TYPE: AgentType = 'platform_guide';

export function threadAgentTypeForStorage(agentType: AgentType): AgentType {
  return agentType;
}

export function isEchoAgentType(agentType: AgentType): boolean {
  return agentType === 'echo';
}

export function echoStorageTypesForLookup(): AgentType[] {
  return ['echo', LEGACY_ECHO_STORAGE_TYPE];
}
