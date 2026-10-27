'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import {
  ECHO_MAX_RECORDING_SECONDS,
  echoRecordingRemainingSeconds,
  echoRecordingWarningActive,
  formatEchoClock,
} from '@/lib/echo/recording-limits';

interface EchoRecordingBannerProps {
  elapsedSeconds: number;
  className?: string;
}

/** Striscia rossa «REC» con cronometro: dice senza dubbi che il microfono è acceso. */
export function EchoRecordingBanner({ elapsedSeconds, className }: EchoRecordingBannerProps) {
  const { t } = useTranslation();
  const remaining = echoRecordingRemainingSeconds(elapsedSeconds);
  const warning = echoRecordingWarningActive(elapsedSeconds);
  const progress = Math.min(100, (elapsedSeconds / ECHO_MAX_RECORDING_SECONDS) * 100);

  return (
    <div
      role="status"
      data-testid="echo-recording-banner"
      className={cn(
        'shrink-0 overflow-hidden rounded-lg border border-destructive bg-destructive text-destructive-foreground shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive-foreground" />
          </span>
          <span className="text-base tracking-widest">{t.echo.recLabel}</span>
          <span className="sr-only">{t.echo.recordingElapsed}</span>
          <span className="text-sm tabular-nums" data-testid="echo-recording-elapsed">
            {formatEchoClock(elapsedSeconds)}
          </span>
        </div>
        <span
          className={cn('text-xs tabular-nums shrink-0', warning && 'animate-pulse')}
          data-testid="echo-recording-remaining"
        >
          {t.echo.recordingRemaining.replace('{time}', formatEchoClock(remaining))}
        </span>
      </div>
      {warning && (
        <p className="bg-black/25 px-3 py-1 text-xs" data-testid="echo-recording-warning">
          {t.echo.recordingLimitWarning.replace('{seconds}', String(remaining))}
        </p>
      )}
      <div className="h-1 bg-black/25" aria-hidden>
        <div className="h-full bg-destructive-foreground/80" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
