import type { AgentType } from '@/lib/agents/models';

/**
 * Persist Echo threads as platform_guide until migration
 * `20260623120000_echo_agent_type.sql` is applied on Supabase.
 * API routing still uses agentType `echo` for prompts and tools.
 */
export function threadAgentTypeForStorage(agentType: AgentType): AgentType {
  return agentType === 'echo' ? 'platform_guide' : agentType;
}

export function isEchoAgentType(agentType: AgentType): boolean {
  return agentType === 'echo';
}
