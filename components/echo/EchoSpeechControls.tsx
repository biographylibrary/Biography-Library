'use client';

import { Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface EchoSpeakingBannerProps {
  onStopSpeaking: () => void;
}

export function EchoSpeakingBanner({ onStopSpeaking }: EchoSpeakingBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Volume2 className="h-4 w-4 text-primary shrink-0 animate-pulse" />
        <span className="text-xs font-medium text-primary truncate">{t.echo.speakingBanner}</span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0 gap-1.5 text-xs"
        onClick={onStopSpeaking}
      >
        <Square className="h-3 w-3 fill-current" />
        {t.echo.stopSpeaking}
      </Button>
    </div>
  );
}

interface EchoVoiceOutputButtonProps {
  voiceOutputEnabled: boolean;
  onToggleVoiceOutput: () => void;
  compact?: boolean;
}

export function EchoVoiceOutputButton({
  voiceOutputEnabled,
  onToggleVoiceOutput,
  compact = false,
}: EchoVoiceOutputButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      size="icon"
      variant={voiceOutputEnabled ? 'outline' : 'secondary'}
      className={compact ? 'h-11 w-11 shrink-0' : 'h-11 w-11 shrink-0'}
      onClick={onToggleVoiceOutput}
      title={voiceOutputEnabled ? t.echo.muteVoice : t.echo.unmuteVoice}
    >
      {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  );
}

interface EchoStopSpeakingButtonProps {
  onStopSpeaking: () => void;
  compact?: boolean;
}

export function EchoStopSpeakingButton({ onStopSpeaking, compact = false }: EchoStopSpeakingButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={compact ? 'h-11 w-11 shrink-0' : 'h-11 w-11 shrink-0'}
      onClick={onStopSpeaking}
      title={t.echo.stopSpeaking}
    >
      <Square className="h-4 w-4 fill-current" />
    </Button>
  );
}
