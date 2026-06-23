'use client';

import { EchoChat } from './EchoChat';
import { EchoOrb } from './EchoOrb';
import { useEcho } from '@/lib/echo/echo-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EchoBubbleProps {
  biographyId?: string;
  activeSection?: string;
  biographyMode?: 'sections' | 'freeflow';
}

export function EchoBubble({ biographyId, activeSection, biographyMode }: EchoBubbleProps) {
  const { bubbleOpen, setBubbleOpen, orbState } = useEcho();
  const { t } = useTranslation();

  const echoPage =
    biographyMode === 'freeflow'
      ? 'editor_freeflow'
      : biographyId
        ? 'editor_sections'
        : 'other';

  return (
    <>
      <button
        type="button"
        onClick={() => setBubbleOpen(!bubbleOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 rounded-full shadow-lg p-1 bg-background border',
          'hover:scale-105 transition-transform'
        )}
        aria-label={t.echo.openEcho}
      >
        <EchoOrb state={orbState} size="sm" />
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
              echoPage={echoPage}
              biographyId={biographyId}
              activeSection={activeSection}
              biographyMode={biographyMode}
              className="flex-1 min-h-0 p-2"
              showOrb={false}
              orbSize="sm"
              loadHistory
            />
          </div>
        </>
      )}
    </>
  );
}
