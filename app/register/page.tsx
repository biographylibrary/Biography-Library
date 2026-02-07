'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Loader2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    if (password.length < 6) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name);
    if (error) {
      setError(error);
      setIsLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo height={64} />
            </div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">{t.auth.createYourAccount}</h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.registerSubtitle}
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
              <Label htmlFor="name">{t.auth.fullName}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t.auth.yourName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="h-11"
              />
            </div>

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
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.atLeastSixChars}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t.auth.repeatPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
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
                  {t.auth.creatingAccount}
                </>
              ) : (
                t.auth.createAccount
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t.auth.alreadyHaveAccount}{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
