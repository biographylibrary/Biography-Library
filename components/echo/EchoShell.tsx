'use client';

import { usePathname } from 'next/navigation';
import { EchoProvider } from '@/lib/echo/echo-context';
import { EchoBubble } from '@/components/echo/EchoBubble';

interface EchoShellProps {
  children: React.ReactNode;
  biographyId?: string;
  sectionKey?: string;
  biographyMode?: 'sections' | 'freeflow';
}

export function EchoShell({
  children,
  biographyId,
  sectionKey,
  biographyMode,
}: EchoShellProps) {
  const pathname = usePathname();
  const isEchoHub = pathname === '/echo';
  const page = isEchoHub
    ? 'hub'
    : biographyMode === 'freeflow'
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
      {children}
      {!isEchoHub && (
        <EchoBubble
          biographyId={biographyId}
          activeSection={sectionKey}
          biographyMode={biographyMode}
        />
      )}
    </EchoProvider>
  );
}
