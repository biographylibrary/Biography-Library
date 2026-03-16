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
import { ThemeToggle } from '@/components/theme-toggle';
import { Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });
  }, []);

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

    setIsUpdating(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setIsUpdating(false);
    } else {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

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
            <h1 className="text-2xl font-serif font-semibold tracking-tight">
              {t.auth.resetPasswordTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.resetPasswordSubtitle}
            </p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {t.auth.passwordUpdated}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t.auth.passwordUpdatedMessage}
                </p>
              </div>
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
                  placeholder={t.auth.enterNewPassword}
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
                  placeholder={t.auth.repeatNewPassword}
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
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.auth.updatingPassword}
                  </>
                ) : (
                  t.auth.resetPassword
                )}
              </Button>
            </form>
          )}

          {!done && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.auth.backToLogin}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
