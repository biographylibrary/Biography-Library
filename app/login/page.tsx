'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) {
      router.push(returnTo || '/dashboard');
    }
  }, [user, loading, router, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error, emailNotConfirmed } = await signIn(email, password);
    if (emailNotConfirmed) {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }
    if (error) {
      setError(error);
      setIsLoading(false);
    } else {
      router.push(returnTo || '/dashboard');
    }
  };

  if (loading || user) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo height={64} />
            </div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">{t.auth.welcomeBack}</h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.signInSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.enterPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.loggingIn}
                </>
              ) : (
                t.auth.signIn
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t.auth.dontHaveAccount}{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.auth.createOne}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
