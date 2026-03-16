'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type FontSize = 'small' | 'normal' | 'large' | 'extra-large';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  const emailVerified = !!user?.email_confirmed_at;

  const loadFontSize = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('ui_font_size')
      .eq('id', userId)
      .maybeSingle();

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
    const sessionTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadFontSize(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadFontSize(session.user.id);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, [loadFontSize]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (!error && data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, email, name },
        { onConflict: 'id' }
      );
    }

    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, emailVerified, fontSize, setFontSize, signIn, signUp, signOut }}>
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
