'use client';

import { Suspense } from 'react';
import { Loader as Loader2 } from 'lucide-react';

function LoginRedirectFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<LoginRedirectFallback />}>{children}</Suspense>;
}
