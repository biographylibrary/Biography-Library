'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { mapBrowserTagToAppLanguage } from '@/lib/i18n/detect-browser-language';
import type { Language } from '@/lib/i18n/translations';

type FontSize = 'small' | 'normal' | 'large' | 'extra-large';

export type UserRole = 'user' | 'reviewer' | 'admin' | 'super_admin';

export const ADMIN_ROLES: UserRole[] = ['reviewer', 'admin', 'super_admin'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null; emailNotConfirmed?: boolean }>;
  signUp: (email: string, password: string, name: string, language?: Language) => Promise<{ error: string | null; emailConfirmRequired?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  const loadProfile = useCallback(async (userId: string) => {
    type ProfileRow = {
      ui_font_size?: string | null;
      role?: string | null;
      account_status?: string | null;
    };

    let data: ProfileRow | null = null;

    const full = await supabase
      .from('profiles')
      .select('ui_font_size, role, account_status')
      .eq('id', userId)
      .maybeSingle();

    if (full.error) {
      const legacy = await supabase
        .from('profiles')
        .select('ui_font_size, role')
        .eq('id', userId)
        .maybeSingle();
      data = legacy.data as ProfileRow | null;
    } else {
      data = full.data as ProfileRow | null;
    }

    if (!data) {
      setRole(null);
      return;
    }

    const status = data.account_status;
    if (status === 'suspended') {
      try {
        sessionStorage.setItem('bl_auth_notice', 'account_suspended');
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut();
      setRole(null);
      return;
    }

    if (data.role && ['user', 'reviewer', 'admin', 'super_admin'].includes(data.role)) {
      setRole(data.role as UserRole);
    } else {
      setRole(null);
    }

    if (data?.ui_font_size) {
      setFontSize(data.ui_font_size as FontSize);
      const fontSizeMap: Record<FontSize, string> = {
        'small': '90%',
        'normal': '100%',
        'large': '115%',
        'extra-large': '130%',
      };
      document.documentElement.style.fontSize = fontSizeMap[data.ui_font_size as FontSize];
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setRole(null);
        }
        // Wait for INITIAL_SESSION so we do not flash login/register forms before
        // persisted session is restored (getSession can briefly return null).
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('banned') || msg.includes('ban')) {
        return { error: 'ACCOUNT_SUSPENDED' };
      }
      return { error: error.message };
    }
    if (data.user && !data.user.email_confirmed_at) {
      return { error: null, emailNotConfirmed: true };
    }
    if (data.user) {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', data.user.id)
        .maybeSingle();
      if (
        !profErr &&
        (prof as { account_status?: string } | null)?.account_status === 'suspended'
      ) {
        await supabase.auth.signOut();
        return { error: 'ACCOUNT_SUSPENDED' };
      }
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, language?: Language) => {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

    const signupLanguage =
      language ??
      (typeof window !== 'undefined'
        ? mapBrowserTagToAppLanguage(window.navigator.language) ?? 'en'
        : 'en');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, language: signupLanguage },
        emailRedirectTo: redirectTo,
      },
    });

    if (!error && data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, email, name, language: signupLanguage },
        { onConflict: 'id' }
      );
    }

    const emailConfirmRequired = !error && data.user && !data.session;
    return { error: error?.message ?? null, emailConfirmRequired: emailConfirmRequired ?? false };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, fontSize, setFontSize, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
