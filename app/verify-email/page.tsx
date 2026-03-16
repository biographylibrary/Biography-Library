'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Loader as Loader2, Mail, CircleCheck as CheckCircle2, ArrowLeft } from 'lucide-react';

interface VerifyEmailPageProps {
  searchParams?: { email?: string };
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const email = searchParams?.email ?? '';
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError('');
    setResent(false);

    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
      setError(error.message);
    } else {
      setResent(true);
    }
    setIsResending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo height={64} />
            </div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight">
              {t.auth.verifyEmailTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.auth.verifyEmailMessage}
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              {email && (
                <div className="space-y-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">
                    {t.auth.verifyEmailSentTo}
                  </p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 break-all">
                    {email}
                  </p>
                </div>
              )}
            </div>

            {resent && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t.auth.emailResent}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <span>{error}</span>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {t.auth.checkSpam}
            </p>

            {email && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.auth.resendingEmail}
                  </>
                ) : (
                  t.auth.resendEmail
                )}
              </Button>
            )}
          </div>

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
