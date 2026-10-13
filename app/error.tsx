'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

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
      <h2 className="text-2xl">{t.errors.title}</h2>
      <p className="text-muted-foreground max-w-md">
        {t.errors.description}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t.errors.tryAgain}</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          {t.errors.goToDashboard}
        </Button>
      </div>
    </div>
  );
}
