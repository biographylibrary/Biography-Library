'use client';

import { cn } from '@/lib/utils';

export type EchoOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface EchoOrbProps {
  state?: EchoOrbState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

export function EchoOrb({ state = 'idle', size = 'md', className }: EchoOrbProps) {
  return (
    <div
      className={cn('relative flex items-center justify-center', sizeMap[size], className)}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br from-[#C4DAEB]/40 to-[#121212]/10',
          state === 'listening' && 'animate-pulse scale-110',
          state === 'speaking' && 'animate-pulse',
          state === 'thinking' && 'animate-pulse opacity-80'
        )}
      />
      <div
        className={cn(
          'relative rounded-full bg-gradient-to-br from-[#C4DAEB] via-[#9BB8D3] to-[#6B8FA8] shadow-lg',
          size === 'sm' && 'h-7 w-7',
          size === 'md' && 'h-12 w-12',
          size === 'lg' && 'h-20 w-20',
          size === 'xl' && 'h-28 w-28',
          state === 'listening' && 'ring-4 ring-[#C4DAEB]/50 ring-offset-2',
          state === 'speaking' && 'ring-2 ring-primary/30'
        )}
      />
      <div
        className={cn(
          'absolute rounded-full bg-white/30 blur-sm',
          size === 'sm' && 'h-2 w-2 -top-0.5 left-2',
          size === 'md' && 'h-3 w-3 top-1 left-3',
          size === 'lg' && 'h-4 w-4 top-2 left-5',
          size === 'xl' && 'h-5 w-5 top-3 left-7'
        )}
      />
    </div>
  );
}
