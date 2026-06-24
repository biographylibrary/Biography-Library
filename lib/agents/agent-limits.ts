export const AGENT_UI_MESSAGE_LIMIT = parseInt(process.env.AGENT_UI_MESSAGE_LIMIT ?? '200', 10);
export const AGENT_CONTEXT_MESSAGE_LIMIT = parseInt(
  process.env.AGENT_CONTEXT_MESSAGE_LIMIT ?? '60',
  10
);
export const AGENT_COMPRESS_AFTER_MESSAGES = parseInt(
  process.env.AGENT_COMPRESS_AFTER_MESSAGES ?? '25',
  10
);
export const AGENT_KEEP_RECENT_RAW = parseInt(process.env.AGENT_KEEP_RECENT_RAW ?? '30', 10);
export const AGENT_SUMMARY_MAX_CHARS = parseInt(process.env.AGENT_SUMMARY_MAX_CHARS ?? '1500', 10);
