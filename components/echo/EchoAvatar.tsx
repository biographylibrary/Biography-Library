'use client';

import { EchoOrb, type EchoOrbState } from './EchoOrb';
import { cn } from '@/lib/utils';

interface EchoAvatarProps {
  state?: EchoOrbState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  statusText?: string;
  className?: string;
}

export function EchoAvatar({
  state = 'idle',
  size = 'md',
  showName = true,
  statusText,
  className,
}: EchoAvatarProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <EchoOrb state={state} size={size} />
      {showName && (
        <span className="font-serif text-lg font-medium tracking-tight text-foreground">Echo</span>
      )}
      {statusText && (
        <span className="text-xs text-muted-foreground text-center max-w-[200px]">{statusText}</span>
      )}
    </div>
  );
}
