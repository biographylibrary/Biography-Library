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
import { postLoginPath } from '@/lib/waitlist';
import { brandHex } from '@/lib/ui-palette';

export default function VerifyEmailPage() {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { user, accountStatus, role, profileReady } = useAuth();
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
        setTimeout(() => router.push(postLoginPath({ accountStatus, role })), 2500);
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (user?.email_confirmed_at && !verifyError && profileReady) {
      router.push(postLoginPath({ accountStatus, role }));
    }
  }, [user, verifyError, router, profileReady, accountStatus, role]);

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
            <div className="notice tone-success flex flex-col items-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-serif">
                  {t.auth.verifyEmailConfirmedTitle}
                </h2>
                <p className="text-sm">
                  {t.auth.verifyEmailConfirmedDetail}
                </p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : verifyError ? (
            <div className="notice tone-danger flex flex-col items-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <p>{t.auth.verifyEmailFailedTitle}</p>
                <p className="text-sm mt-1">
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
            <div className="flex flex-col items-center gap-5 p-7 rounded-xl border border-brand-blue text-center shadow-sm bg-brand-blue">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand-blue">
                <Mail className="h-8 w-8" style={{ color: brandHex.ink }} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif" style={{ color: brandHex.ink }}>
                  {t.auth.verifyEmailTitle}
                </h2>
                {emailForResend && (
                  <p className="text-sm" style={{ color: brandHex.ink }}>
                    {emailForResend}
                  </p>
                )}
                <p className="text-sm" style={{ color: brandHex.ink }}>
                  {t.auth.verifyEmailLinkSent}
                </p>
                <p className="text-xs mt-1" style={{ color: brandHex.ink }}>
                  {t.auth.verifyEmailAutoUpdate}
                </p>
              </div>

              <div className="w-full flex items-center gap-2">
                <div className="h-px flex-1 bg-brand-blue" />
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: brandHex.ink }} />
                <div className="h-px flex-1 bg-brand-blue" />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheck}
                  disabled={checkingStatus}
                  className="border-brand-blue hover:bg-brand-blue/40"
                  style={{ color: brandHex.ink }}
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
                  <div className="flex items-center justify-center gap-2 text-sm py-1" style={{ color: brandHex.ink }}>
                    <CheckCircle2 className="h-4 w-4" />
                    {t.auth.verifyEmailResendSuccessInline}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendLoading || !emailForResend || resendCooldown > 0}
                    className="hover:bg-brand-blue/40 text-xs"
                    style={{ color: brandHex.wineDark }}
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
              className="transition-colors hover:opacity-80"
              style={{ color: brandHex.wineDark }}
            >
              {t.auth.backToLogin}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
