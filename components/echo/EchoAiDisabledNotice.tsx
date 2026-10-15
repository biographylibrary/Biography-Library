'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/lib/i18n/i18n-context';

/** Riquadro informativo quando le funzioni IA sono spente (stile avviso «info»). */
export function EchoAiDisabledNotice({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Alert variant="info" className={className} data-testid="echo-ai-disabled-notice">
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <p>{t.echo.aiFeaturesDisabled}</p>
        <p>
          <Link href="/settings" className="underline underline-offset-2 hover:opacity-90">
            {t.echo.goToSettings}
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}
