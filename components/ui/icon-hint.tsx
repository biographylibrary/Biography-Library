'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface IconHintProps {
  label: string;
  children: ReactNode;
  /** When set, the hint is shown only below this width. */
  maxWidth?: number;
  side?: 'top' | 'bottom';
}

export function IconHint({ label, children, maxWidth, side = 'top' }: IconHintProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const pinnedUntil = useRef(0);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({
      top: side === 'top' ? rect.top - 6 : rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
  };

  const allowed = () => {
    if (typeof window === 'undefined') return false;
    if (maxWidth == null) return true;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  };

  const show = (pin: boolean) => {
    if (!allowed()) return;
    place();
    if (timer.current) window.clearTimeout(timer.current);
    if (pin) {
      pinnedUntil.current = Date.now() + 2000;
      timer.current = window.setTimeout(() => setBox(null), 2000);
    }
  };

  const hide = () => {
    if (Date.now() < pinnedUntil.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    setBox(null);
  };

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onPointerEnter={() => show(false)}
      onPointerDown={() => show(true)}
      onPointerLeave={hide}
    >
      {children}
      {box &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[200] whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[11px] leading-none text-white shadow-md"
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
