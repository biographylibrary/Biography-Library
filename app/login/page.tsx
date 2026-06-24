import { Suspense } from 'react';
import { Loader as Loader2 } from 'lucide-react';
import LoginRedirectInner from './LoginRedirectInner';

function LoginRedirectFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function LoginRedirectPage() {
  return (
    <Suspense fallback={<LoginRedirectFallback />}>
      <LoginRedirectInner />
    </Suspense>
  );
}
