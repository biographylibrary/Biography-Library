'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Loader as Loader2, Mail, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function VerifyEmailPage() {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') ?? '';
  const emailForResend = user?.email ?? emailFromUrl;

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setVerifyError(decodeURIComponent(errorParam));
      return;
    }

    pollRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user;
      if (currentUser?.email_confirmed_at) {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(() => router.push('/dashboard'), 2500);
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (user?.email_confirmed_at && !verifyError) {
      router.push('/dashboard');
    }
  }, [user, verifyError, router]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (!emailForResend || resendCooldown > 0) return;
    setResendLoading(true);
    setResendSuccess(false);
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';
    await supabase.auth.resend({
      type: 'signup',
      email: emailForResend,
      options: { emailRedirectTo: redirectTo },
    });
    setResendLoading(false);
    setResendSuccess(true);
    startCooldown();
  };

  const handleManualCheck = async () => {
    setCheckingStatus(true);
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (currentUser?.email_confirmed_at) {
      setConfirmed(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    }
    setCheckingStatus(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-center mb-8">
            <Logo height={64} />
          </div>

          {confirmed ? (
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-serif font-semibold text-green-900 dark:text-green-100">
                  Email confermata!
                </h2>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Il tuo account è stato verificato. Reindirizzamento alla dashboard...
                </p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
            </div>
          ) : verifyError ? (
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive">Verifica non riuscita</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Il link di conferma è scaduto o è già stato utilizzato. Richiedine uno nuovo.
                </p>
              </div>
              {emailForResend && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Invio in corso...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Reinvia tra ${resendCooldown}s`
                  ) : (
                    'Invia nuova email di conferma'
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 p-7 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif font-semibold text-blue-900 dark:text-blue-100">
                  Controlla la tua email
                </h2>
                {emailForResend && (
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {emailForResend}
                  </p>
                )}
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Ti abbiamo inviato un link di conferma. Clicca sul link nell&apos;email per attivare il tuo account.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Questa pagina si aggiornerà automaticamente dopo la conferma.
                </p>
              </div>

              <div className="w-full flex items-center gap-2">
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 dark:text-blue-500 shrink-0" />
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheck}
                  disabled={checkingStatus}
                  className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Verifica in corso...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Ho già confermato, accedi
                    </>
                  )}
                </Button>

                {resendSuccess ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium py-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Email inviata! Controlla la casella di posta.
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendLoading || !emailForResend || resendCooldown > 0}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Invio in corso...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Reinvia tra ${resendCooldown}s`
                    ) : (
                      "Non hai ricevuto l'email? Inviala di nuovo"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

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
