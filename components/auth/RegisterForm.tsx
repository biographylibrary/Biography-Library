'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getProposedRegistrationLanguage } from '@/lib/i18n/detect-browser-language';
import type { Language } from '@/lib/i18n/translations';
import { RegistrationLanguagePicker } from '@/components/auth/RegistrationLanguagePicker';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import {
  evaluatePassword,
  formatMissingPasswordRequirements,
  resolvePasswordAuthError,
} from '@/lib/password-policy';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import {
  Loader as Loader2,
  CircleAlert as AlertCircle,
  Mail,
  CircleCheck as CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { postLoginPath } from '@/lib/waitlist';

export function RegisterForm({ embedded = false }: { embedded?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { signUp, signOut, user, loading, profileReady, accountStatus, role } = useAuth();
  const router = useRouter();
  const { t, setLanguage } = useTranslation();
  const [registrationLanguage, setRegistrationLanguage] = useState<Language>('en');

  useEffect(() => {
    const initial = getProposedRegistrationLanguage();
    setRegistrationLanguage(initial);
    void setLanguage(initial);
  }, [setLanguage]);

  const handleRegistrationLanguageChange = (lang: Language) => {
    setRegistrationLanguage(lang);
    void setLanguage(lang);
  };

  useEffect(() => {
    if (!loading && profileReady && user?.email_confirmed_at) {
      router.replace(postLoginPath({ accountStatus, role }));
    }
  }, [user, loading, profileReady, accountStatus, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const evaluation = evaluatePassword(password);
    if (!evaluation.valid) {
      setError(formatMissingPasswordRequirements(evaluation.missing, t.auth));
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    setIsLoading(true);

    const signUpResult = await signUp(email, password, name, registrationLanguage);
    if (signUpResult.error) {
      setError(resolvePasswordAuthError(signUpResult, t.auth, password));
      setIsLoading(false);
    } else if (signUpResult.emailConfirmRequired) {
      setShowVerification(true);
      setIsLoading(false);
    } else {
      router.push('/waitlist');
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.email_confirmed_at) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !user.email_confirmed_at) {
    const pendingEmail = user.email ?? email;
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
            <div className="notice tone-info flex flex-col items-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <Mail className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif">
                  {t.auth.verifyEmailTitle}
                </h2>
                <p className="text-sm">
                  {t.auth.verifySentTo}{' '}
                  <span className="break-all">{pendingEmail}</span>.
                  <br />
                  {t.auth.verifyEmailLinkSent}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                {t.auth.useAnotherEmail}
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                {t.auth.backToLogin}
              </Link>
            </p>
          </div>
        </div>
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
            <div className="notice tone-info flex flex-col items-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                <Mail className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif">
                  {t.auth.verifyEmailTitle}
                </h2>
                <p className="text-sm">
                  {t.auth.verifySentTo}{' '}
                  <span className="break-all">{email}</span>.
                  <br />
                  {t.auth.verifyEmailLinkSent}
                </p>
                <p className="text-xs mt-2">
                  {t.auth.verifyEmailDetail}
                </p>
              </div>

              {resendSuccess ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.auth.resendVerificationSuccess}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendLoading}
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
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {t.auth.backToLogin}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const form = (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <RegistrationLanguagePicker
              value={registrationLanguage}
              onChange={handleRegistrationLanguageChange}
              label={t.auth.registrationLanguage}
            />

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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.auth.atLeastSixChars}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                  data-testid="toggle-password-visibility"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <PasswordRequirements password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t.auth.repeatPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? t.auth.hidePassword : t.auth.showPassword}
                  data-testid="toggle-confirm-password-visibility"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
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
  );

  if (embedded) {
    return <div className="w-full">{form}</div>;
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
            <h1 className="text-2xl font-serif tracking-tight">{t.auth.createYourAccount}</h1>
          </div>

          {form}

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t.auth.alreadyHaveAccount}{' '}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {t.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
