'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setIsSending(false);
    } else {
      setSent(true);
      setIsSending(false);
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
              {t.auth.forgotPasswordTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.forgotPasswordSubtitle}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {t.auth.resetLinkSent}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t.auth.resetLinkSentMessage}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 font-medium bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded-full">
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t.auth.checkSpam}
              </p>
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

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.auth.sendingResetLink}
                  </>
                ) : (
                  t.auth.sendResetLink
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.auth.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
