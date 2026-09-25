'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface IconHintProps {
  label: string;
  children: ReactNode;
  /** Show the hint only below this width. 1023 covers phones and tablets. */
  maxWidth?: number;
  side?: 'top' | 'bottom';
}

export function IconHint({ label, children, maxWidth = 1023, side = 'top' }: IconHintProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia(`(max-width: ${maxWidth}px)`).matches) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({
      top: side === 'top' ? rect.top - 6 : rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBox(null), 1800);
  };

  return (
    <span ref={anchorRef} className="inline-flex" onPointerDown={show}>
      {children}
      {box &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[80] -translate-x-1/2 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[11px] leading-none text-white"
            style={{
              top: box.top,
              left: box.left,
              transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
