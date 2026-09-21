'use client';

import { Suspense } from 'react';
import { Loader as Loader2 } from 'lucide-react';
import { WaitlistLanding } from '@/components/waitlist/WaitlistLanding';

function LandingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <WaitlistLanding />
    </Suspense>
  );
}
