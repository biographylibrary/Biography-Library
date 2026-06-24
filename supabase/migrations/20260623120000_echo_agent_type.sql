-- Allow echo agent type in agent_threads
ALTER TABLE agent_threads DROP CONSTRAINT IF EXISTS agent_threads_agent_type_check;

ALTER TABLE agent_threads
  ADD CONSTRAINT agent_threads_agent_type_check
  CHECK (agent_type IN ('platform_guide', 'biography_coach', 'publication_reviewer', 'echo'));
