'use client';

import { EchoOrb, type EchoOrbState } from './EchoOrb';
import { cn } from '@/lib/utils';

interface EchoAvatarProps {
  state?: EchoOrbState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  statusText?: string;
  layout?: 'vertical' | 'horizontal';
  /** Editor-style ring around the orb (white pad + black border). */
  bordered?: boolean;
  tone?: 'default' | 'onDark';
  className?: string;
}

export function EchoAvatar({
  state = 'idle',
  size = 'md',
  showName = true,
  statusText,
  layout = 'vertical',
  bordered = false,
  tone = 'default',
  className,
}: EchoAvatarProps) {
  const horizontal = layout === 'horizontal';
  const onDark = tone === 'onDark';

  const orb = <EchoOrb state={state} size={size} />;

  return (
    <div
      className={cn(
        horizontal ? 'flex flex-row items-center gap-2.5' : 'flex flex-col items-center gap-2',
        className
      )}
    >
      {bordered ? (
        <div className="rounded-full p-1 border border-brand-ink bg-brand-paper shadow-lg shrink-0">
          {orb}
        </div>
      ) : (
        <div className="shrink-0">{orb}</div>
      )}
      {(showName || statusText) && (
        <div className={cn('min-w-0', horizontal ? 'text-left' : 'text-center')}>
          {showName && (
            <span
              className={cn(
                'font-serif font-medium tracking-tight block leading-none',
                horizontal ? 'text-base' : 'text-lg',
                onDark ? 'text-brand-beigeLight' : 'text-foreground'
              )}
            >
              Echo
            </span>
          )}
          {statusText && (
            <span
              className={cn(
                'text-xs block',
                horizontal ? 'mt-0.5 truncate max-w-[min(100%,14rem)]' : 'text-center max-w-[200px] mt-0.5',
                onDark ? 'text-brand-beigeLight/65' : 'text-muted-foreground'
              )}
            >
              {statusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
