'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setSessionReady(true);
        else setSessionError(true);
      });
    } else if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (!error) setSessionReady(true);
        else setSessionError(true);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true);
        else setSessionError(true);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  };

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
            <h1 className="text-2xl font-serif font-semibold tracking-tight">
              {t.auth.resetPasswordTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.resetPasswordSubtitle}
            </p>
          </div>

          {sessionError ? (
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">{t.auth.resetPasswordInvalidLink}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.auth.resetPasswordInvalidLinkDetail}
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {t.auth.resetPasswordRequestNew}
              </Link>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t.auth.resetPasswordVerifying}</p>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {t.auth.resetPasswordSuccess}
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    {t.auth.resetPasswordSuccessDetail}
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {t.auth.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.newPassword}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.auth.atLeastEightChars}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.auth.confirmNewPassword}</Label>
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
                    {t.auth.resetPasswordUpdating}
                  </>
                ) : (
                  t.auth.resetPasswordButton
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
