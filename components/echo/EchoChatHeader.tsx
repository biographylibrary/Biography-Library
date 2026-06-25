'use client';

import { EchoAvatar } from './EchoAvatar';
import type { EchoOrbState } from './EchoOrb';
import { cn } from '@/lib/utils';

interface EchoChatHeaderProps {
  orbState: EchoOrbState;
  activityStatus: string;
  isActive: boolean;
  className?: string;
}

export function EchoChatHeader({
  orbState,
  activityStatus,
  isActive,
  className,
}: EchoChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 shrink-0 h-12 px-3',
        'bg-dark-bg-main border-b border-white/10',
        className
      )}
    >
      <EchoAvatar
        state={orbState}
        size="sm"
        layout="horizontal"
        bordered
        tone="onDark"
      />
      <p
        className={cn(
          'text-xs sm:text-sm text-right leading-snug max-w-[55%] sm:max-w-[50%] truncate sm:whitespace-normal',
          'text-brand-beigeLight',
          isActive && 'font-medium'
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {activityStatus}
      </p>
    </div>
  );
}
