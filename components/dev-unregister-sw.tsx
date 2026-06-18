'use client';

import { useEffect } from 'react';
import { clearDevServiceWorkers } from '@/lib/dev-clear-pwa';

/** Backup: head script should run first; this clears any worker registered after hydration. */
export function DevUnregisterServiceWorker() {
  useEffect(() => {
    void clearDevServiceWorkers();
  }, []);

  return null;
}
