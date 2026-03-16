'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Loader as Loader2, Mail, CircleCheck as CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function VerifyEmailPage() {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleResend = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendSuccess(false);
    await supabase.auth.resend({ type: 'signup', email: user.email });
    setResendLoading(false);
    setResendSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
                {t.auth.verifyEmailSubtitle}
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
                disabled={resendLoading || !user?.email}
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
