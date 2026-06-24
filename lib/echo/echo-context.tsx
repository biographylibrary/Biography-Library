'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type EchoPageContext =
  | 'hub'
  | 'editor_sections'
  | 'editor_freeflow'
  | 'publication'
  | 'dashboard'
  | 'other';

export type EchoOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface EchoContextValue {
  page: EchoPageContext;
  biographyId?: string;
  sectionKey?: string;
  biographyMode?: 'sections' | 'freeflow';
  publicationStatus?: string;
  orbState: EchoOrbState;
  setOrbState: (s: EchoOrbState) => void;
  bubbleOpen: boolean;
  setBubbleOpen: (open: boolean) => void;
}

const EchoContext = createContext<EchoContextValue | null>(null);

export function EchoProvider({
  children,
  page = 'other',
  biographyId,
  sectionKey,
  biographyMode,
  publicationStatus,
}: {
  children: ReactNode;
  page?: EchoPageContext;
  biographyId?: string;
  sectionKey?: string;
  biographyMode?: 'sections' | 'freeflow';
  publicationStatus?: string;
}) {
  const [orbState, setOrbState] = useState<EchoOrbState>('idle');
  const [bubbleOpen, setBubbleOpen] = useState(false);

  const value = useMemo(
    () => ({
      page,
      biographyId,
      sectionKey,
      biographyMode,
      publicationStatus,
      orbState,
      setOrbState,
      bubbleOpen,
      setBubbleOpen,
    }),
    [page, biographyId, sectionKey, biographyMode, publicationStatus, orbState, bubbleOpen]
  );

  return <EchoContext.Provider value={value}>{children}</EchoContext.Provider>;
}

export function useEcho() {
  const ctx = useContext(EchoContext);
  if (!ctx) {
    return {
      page: 'other' as EchoPageContext,
      orbState: 'idle' as EchoOrbState,
      setOrbState: () => {},
      bubbleOpen: false,
      setBubbleOpen: () => {},
    };
  }
  return ctx;
}
