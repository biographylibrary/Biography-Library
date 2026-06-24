/** Stored prefix for the static Echo usage-guide assistant message. */
export const ECHO_USAGE_GUIDE_MARKER = '[[echo-usage-guide]]';

export function wrapUsageGuideContent(body: string): string {
  return `${ECHO_USAGE_GUIDE_MARKER}\n${body}`;
}

export function parseEchoMessageContent(content: string): {
  isUsageGuide: boolean;
  body: string;
} {
  if (content.startsWith(ECHO_USAGE_GUIDE_MARKER)) {
    const body = content.slice(ECHO_USAGE_GUIDE_MARKER.length).replace(/^\n/, '');
    return { isUsageGuide: true, body };
  }
  return { isUsageGuide: false, body: content };
}

export function isUsageGuideContent(content: string): boolean {
  return content.startsWith(ECHO_USAGE_GUIDE_MARKER);
}
