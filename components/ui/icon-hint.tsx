'use client';

import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconHintProps {
  label: string;
  children: ReactNode;
  /** Show the hint only below this width. 1023 covers phones and tablets. */
  maxWidth?: number;
  side?: 'top' | 'bottom';
}

export function IconHint({ label, children, maxWidth = 1023, side = 'top' }: IconHintProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const show = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia(`(max-width: ${maxWidth}px)`).matches) return;
    setOpen(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 1600);
  };

  return (
    <span className="relative inline-flex" onPointerDown={show}>
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[11px] text-white',
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
