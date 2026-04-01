'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
    logger.critical('Unhandled app error', {
      scope: 'app-error',
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md">
        An unexpected error occurred. Your work has been saved automatically.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
