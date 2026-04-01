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
    <div className="h-full flex flex-col bg-background">
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
                  {t.auth.verifyEmailConfirmedTitle}
                </h2>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t.auth.verifyEmailConfirmedDetail}
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
                <p className="font-semibold text-destructive">{t.auth.verifyEmailFailedTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.auth.verifyEmailFailedDetail}
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
                      {t.auth.resendVerificationSending}
                    </>
                  ) : resendCooldown > 0 ? (
                    t.auth.resendCooldown.replace('{seconds}', String(resendCooldown))
                  ) : (
                    t.auth.resendNewConfirmEmail
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 p-7 rounded-xl border text-center shadow-sm" style={{ backgroundColor: '#C4DAEB', borderColor: '#a8c9e0' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#a8c9e0' }}>
                <Mail className="h-8 w-8" style={{ color: '#121212' }} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif font-semibold" style={{ color: '#121212' }}>
                  {t.auth.verifyEmailTitle}
                </h2>
                {emailForResend && (
                  <p className="text-sm font-medium" style={{ color: '#121212' }}>
                    {emailForResend}
                  </p>
                )}
                <p className="text-sm" style={{ color: '#121212' }}>
                  {t.auth.verifyEmailLinkSent}
                </p>
                <p className="text-xs mt-1" style={{ color: '#121212' }}>
                  {t.auth.verifyEmailAutoUpdate}
                </p>
              </div>

              <div className="w-full flex items-center gap-2">
                <div className="h-px flex-1" style={{ backgroundColor: '#a8c9e0' }} />
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: '#121212' }} />
                <div className="h-px flex-1" style={{ backgroundColor: '#a8c9e0' }} />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheck}
                  disabled={checkingStatus}
                  className="border-[#a8c9e0] hover:bg-[#a8c9e0]/40"
                  style={{ color: '#121212' }}
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {t.auth.verifyEmailChecking}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      {t.auth.verifyEmailAlreadyConfirmed}
                    </>
                  )}
                </Button>

                {resendSuccess ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-medium py-1" style={{ color: '#121212' }}>
                    <CheckCircle2 className="h-4 w-4" />
                    {t.auth.verifyEmailResendSuccessInline}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendLoading || !emailForResend || resendCooldown > 0}
                    className="hover:bg-[#a8c9e0]/40 text-xs"
                    style={{ color: '#6D323E' }}
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        {t.auth.resendVerificationSending}
                      </>
                    ) : resendCooldown > 0 ? (
                      t.auth.resendCooldown.replace('{seconds}', String(resendCooldown))
                    ) : (
                      t.auth.verifyEmailDidntReceive
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link
              href="/login"
              className="font-medium transition-colors hover:opacity-80"
              style={{ color: '#6D323E' }}
            >
              {t.auth.backToLogin}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
