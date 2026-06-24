'use client';

import { cn } from '@/lib/utils';
import type { EchoIcebreakerItem } from '@/lib/echo/echo-icebreakers';

interface EchoIcebreakersProps {
  hint: string;
  guideHint: string;
  items: EchoIcebreakerItem[];
  onSelect: (text: string) => void;
  onRecallUsageGuide: () => void;
  className?: string;
  centered?: boolean;
}

export function EchoIcebreakers({
  hint,
  guideHint,
  items,
  onSelect,
  onRecallUsageGuide,
  className,
  centered = false,
}: EchoIcebreakersProps) {
  if (items.length === 0) return null;

  const dynamicItems = items.filter((item) => item.kind !== 'usage-guide');
  const guideItem = items.find((item) => item.kind === 'usage-guide');

  return (
    <div
      className={cn(
        'py-2 space-y-2',
        centered ? 'text-center' : 'text-left',
        className
      )}
    >
      {dynamicItems.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground/60 italic">{hint}</p>
          <ul className={cn('space-y-1.5', centered && 'flex flex-col items-center')}>
            {dynamicItems.map((item) => (
              <li key={item.text}>
                <button
                  type="button"
                  onClick={() => onSelect(item.text)}
                  className={cn(
                    'text-sm text-muted-foreground/75 italic font-light',
                    'hover:text-foreground/90 hover:underline underline-offset-2',
                    'transition-colors text-left max-w-full',
                    centered && 'text-center'
                  )}
                >
                  «{item.text}»
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {guideItem && (
        <div className={cn('pt-1', centered && 'flex flex-col items-center')}>
          <p className="text-xs text-muted-foreground/80 not-italic font-medium">
            {guideHint}
          </p>
          <button
            type="button"
            onClick={onRecallUsageGuide}
            className={cn(
              'mt-1 text-sm text-primary/90 font-medium not-italic',
              'hover:text-primary hover:underline underline-offset-2',
              'transition-colors text-left max-w-full',
              centered && 'text-center'
            )}
          >
            «{guideItem.text}»
          </button>
        </div>
      )}
    </div>
  );
}
