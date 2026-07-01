'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EchoChat } from './EchoChat';
import { EchoOrb } from './EchoOrb';
import { useEcho } from '@/lib/echo/echo-context';
import { useEchoChat } from '@/lib/echo/echo-chat-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EchoBubble() {
  const { bubbleOpen, setBubbleOpen, orbState } = useEcho();
  const { t } = useTranslation();
  const { pendingDraftCount } = useEchoChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <>
      <button
        type="button"
        data-tour-id="echo-bubble"
        onClick={() => setBubbleOpen(!bubbleOpen)}
        className={cn(
          'fixed right-4 md:right-6 floating-action-bottom z-50 rounded-full shadow-lg p-1 bg-background border',
          'hover:scale-105 transition-transform'
        )}
        aria-label={t.echo.openEcho}
      >
        <span className="relative inline-flex">
          <EchoOrb state={orbState} size="sm" />
          {pendingDraftCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {pendingDraftCount}
            </span>
          )}
        </span>
      </button>

      {bubbleOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 md:hidden"
            onClick={() => setBubbleOpen(false)}
          />
          <div
            className={cn(
              'fixed z-50 flex flex-col bg-background border shadow-xl',
              'bottom-0 left-0 right-0 h-[70vh] rounded-t-xl md:bottom-6 md:right-6 md:left-auto md:w-96 md:h-[min(560px,80vh)] md:rounded-xl'
            )}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="font-serif font-medium">Echo</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setBubbleOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EchoChat
              className="flex-1 min-h-0 p-2"
              showOrb={false}
              orbSize="sm"
            />
          </div>
        </>
      )}
    </>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
