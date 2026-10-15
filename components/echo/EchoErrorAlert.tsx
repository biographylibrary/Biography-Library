'use client';

import Link from 'next/link';
import { CircleAlert as AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { resolveAiErrorMessage } from '@/lib/echo/ai-error-message';

/** Avviso di errore Echo/IA: traduce i codici noti, stile «errore». */
export function EchoErrorAlert({
  raw,
  className,
}: {
  raw: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const resolved = resolveAiErrorMessage(raw, t.echo);

  return (
    <Alert variant="destructive" className={className} data-testid="echo-error-alert">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <p>{resolved.message}</p>
        {resolved.linkToSettings ? (
          <p>
            <Link href="/settings" className="underline underline-offset-2 hover:opacity-90">
              {t.echo.goToSettings}
            </Link>
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
