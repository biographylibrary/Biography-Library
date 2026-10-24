type LogLevel = 'critical' | 'error' | 'warn' | 'info';

interface LogMetadata {
  [key: string]: unknown;
}

interface LogPayload {
  level: LogLevel;
  message: string;
  metadata: LogMetadata | null;
  url: string | null;
  userAgent: string | null;
  timestamp: string;
}

function getEndpointUrl(): string | null {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/log-error`;
  }
  return null;
}

function getAnonKey(): string | null {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  return null;
}

function authStorageKey(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!url) return null;
  const host = url.replace(/https?:\/\//, '').split('.')[0];
  return `sb-${host}-auth-token`;
}

/** Session access token when the user is signed in; otherwise null. */
async function getAccessToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const key = authStorageKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.access_token === 'string' ? parsed.access_token : null;
  } catch {
    return null;
  }
}

async function send(level: LogLevel, message: string, metadata?: LogMetadata): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    const fn = level === 'critical' || level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    fn(`[${level.toUpperCase()}]`, message, metadata ?? '');
  }

  try {
    const endpointUrl = getEndpointUrl();
    const anonKey = getAnonKey();
    if (!endpointUrl || !anonKey) return;

    const accessToken = await getAccessToken();
    const bearer = accessToken || anonKey;

    const payload: LogPayload = {
      level,
      message,
      metadata: metadata ?? null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
    };

    await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
  }
}

export const logger = {
  critical: (message: string, metadata?: LogMetadata) => send('critical', message, metadata),
  error: (message: string, metadata?: LogMetadata) => send('error', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => send('warn', message, metadata),
  info: (message: string, metadata?: LogMetadata) => send('info', message, metadata),
};

export const logCritical = logger.critical;
export const logError = logger.error;
export const logWarn = logger.warn;
export const logInfo = logger.info;
