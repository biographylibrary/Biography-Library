'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, Translations } from './translations';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface I18nContextType {
  language: Language;
  t: Translations;
  /** Guest UI only (e.g. register page preview). Ignored when logged in. */
  setLanguage: (lang: Language) => Promise<void>;
  /** Apply profile language after login — does not persist changes. */
  syncLanguageFromProfile: (lang: Language) => void;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const syncLanguageFromProfile = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('userLanguage', lang);
  }, []);

  const loadUserLanguage = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data?.language) {
        syncLanguageFromProfile(data.language as Language);
      }
    } catch (error) {
      console.error('Error loading user language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, syncLanguageFromProfile]);

  useEffect(() => {
    if (user) {
      void loadUserLanguage();
    } else {
      const savedLang = localStorage.getItem('userLanguage') as Language;
      if (savedLang && ['en', 'it', 'fr', 'de'].includes(savedLang)) {
        setLanguageState(savedLang);
      }
      setIsLoading(false);
    }
  }, [user, loadUserLanguage]);

  const setLanguage = useCallback(async (lang: Language) => {
    if (user) return;
    syncLanguageFromProfile(lang);
  }, [user, syncLanguageFromProfile]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextType = {
    language,
    t: translations[language],
    setLanguage,
    syncLanguageFromProfile,
    isLoading,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
