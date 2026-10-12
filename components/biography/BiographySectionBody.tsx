'use client';

import { biographySectionToSafeHtml } from '@/lib/biography-section-html';
import { cn } from '@/lib/utils';

interface BiographySectionBodyProps {
  text: string;
  className?: string;
}

export function BiographySectionBody({ text, className }: BiographySectionBodyProps) {
  const html = biographySectionToSafeHtml(text);
  if (!html) return null;

  return (
    <div
      className={cn(
        'rich-text max-w-none leading-relaxed font-serif text-base',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
