'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.critical('Unhandled app error', {
      scope: 'global-error',
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
