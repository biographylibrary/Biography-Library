'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { EchoProvider, useEcho } from '@/lib/echo/echo-context';
import { EchoChatProvider } from '@/lib/echo/echo-chat-context';
import { EchoBubble } from '@/components/echo/EchoBubble';

interface EchoShellProps {
  children: React.ReactNode;
  biographyId?: string;
  sectionKey?: string;
  biographyMode?: 'sections' | 'freeflow';
  showBubble?: boolean;
  onDraftApplied?: (sectionKey: string) => void;
  onSectionCompletionChanged?: (sectionKey: string, completed: boolean) => void;
}

function EchoBubbleGate({ show }: { show: boolean }) {
  const { setBubbleOpen } = useEcho();

  useEffect(() => {
    if (!show) setBubbleOpen(false);
  }, [show, setBubbleOpen]);

  if (!show) return null;

  return <EchoBubble />;
}

export function EchoShell({
  children,
  biographyId,
  sectionKey,
  biographyMode,
  showBubble = false,
  onDraftApplied,
  onSectionCompletionChanged,
}: EchoShellProps) {
  const pathname = usePathname();
  const page =
    biographyMode === 'freeflow'
      ? 'editor_freeflow'
      : biographyId
        ? 'editor_sections'
        : pathname === '/dashboard'
          ? 'dashboard'
          : 'other';

  return (
    <EchoProvider
      page={page}
      biographyId={biographyId}
      sectionKey={sectionKey}
      biographyMode={biographyMode}
    >
      {biographyId ? (
        <EchoChatProvider
          echoPage={page}
          biographyId={biographyId}
          activeSection={sectionKey}
          biographyMode={biographyMode}
          onDraftApplied={onDraftApplied}
          onSectionCompletionChanged={onSectionCompletionChanged}
        >
          {children}
          <EchoBubbleGate show={showBubble} />
        </EchoChatProvider>
      ) : (
        <>
          {children}
          <EchoBubbleGate show={showBubble} />
        </>
      )}
    </EchoProvider>
  );
}
