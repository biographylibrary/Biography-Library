'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, Translations } from './translations';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface I18nContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUserLanguage = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data?.language) {
        setLanguageState(data.language as Language);
        localStorage.setItem('userLanguage', data.language);
      }
    } catch (error) {
      console.error('Error loading user language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('userLanguage', lang);

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextType = {
    language,
    t: translations[language],
    setLanguage,
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
