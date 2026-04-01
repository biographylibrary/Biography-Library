'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Loader as Loader2, CircleAlert as AlertCircle, Mail, CircleCheck as CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { signUp, user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) {
      if (user.email_confirmed_at) {
        router.push('/create-biography');
      }
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

    const { error, emailConfirmRequired } = await signUp(email, password, name);
    if (error) {
      setError(error);
      setIsLoading(false);
    } else if (emailConfirmRequired) {
      setShowVerification(true);
      setIsLoading(false);
    } else {
      router.push('/create-biography');
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';
    await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
    setResendLoading(false);
    setResendSuccess(true);
  };

  if (loading || (user && user.email_confirmed_at)) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showVerification) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center mb-8">
              <Logo height={64} />
            </div>
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif font-semibold text-blue-900 dark:text-blue-100">
                  {t.auth.verifyEmailTitle}
                </h2>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t.auth.verifySentTo}{' '}
                  <span className="font-semibold break-all">{email}</span>.
                  <br />
                  {t.auth.verifyEmailLinkSent}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  {t.auth.verifyEmailDetail}
                </p>
              </div>

              {resendSuccess ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.auth.resendVerificationSuccess}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {t.auth.resendVerificationSending}
                    </>
                  ) : (
                    t.auth.resendVerification
                  )}
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t.auth.backToLogin}
              </Link>
            </p>
          </div>
        </div>
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
