'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader as Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        router.replace(`/verify-email?error=${encodeURIComponent(errorDescription ?? errorParam)}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/verify-email?error=${encodeURIComponent(error.message)}`);
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      if (tokenHash && (type === 'signup' || type === 'email' || type === 'recovery')) {
        const otpType = type === 'recovery' ? 'recovery' : 'signup';
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType as 'signup' | 'recovery' });
        if (error) {
          router.replace(`/verify-email?error=${encodeURIComponent(error.message)}`);
        } else if (type === 'recovery') {
          router.replace('/reset-password');
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const hashType = params.get('type');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            router.replace(`/verify-email?error=${encodeURIComponent(error.message)}`);
          } else if (hashType === 'recovery') {
            router.replace('/reset-password');
          } else {
            router.replace('/dashboard');
          }
          return;
        }
      }

      router.replace('/login');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
