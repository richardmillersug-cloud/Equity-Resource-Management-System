'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Locale = 'en' | 'lg';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface TranslationData {
  [key: string]: any;
}

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [translations, setTranslations] = useState<TranslationData>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load translations for the current locale
  const loadTranslations = async (newLocale: Locale) => {
    console.log('Loading translations for locale:', newLocale);
    try {
      setIsLoading(true);
      const response = await fetch(`/locales/${newLocale}/common.json`);
      console.log('Translation response:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load translations: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Translations loaded successfully:', Object.keys(data));
      setTranslations(data);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to English if translation fails
      if (newLocale !== 'en') {
        console.log('Attempting fallback to English...');
        try {
          const fallbackResponse = await fetch('/locales/en/common.json');
          const fallbackData = await fallbackResponse.json();
          setTranslations(fallbackData);
          console.log('Fallback translations loaded');
        } catch (fallbackError) {
          console.error('Fallback translation loading failed:', fallbackError);
          setTranslations({});
        }
      } else {
        setTranslations({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize with saved locale or default
  useEffect(() => {
    console.log('LanguageProvider initializing...');
    const savedLocale = localStorage.getItem('locale') as Locale;
    const initialLocale = savedLocale || 'en';
    console.log('Initial locale:', initialLocale, 'Saved locale:', savedLocale);
    setLocaleState(initialLocale);
    loadTranslations(initialLocale);
  }, []);

  // Change locale function
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    loadTranslations(newLocale);
  };

  // Translation function
  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  return (
    <LanguageContext.Provider value={{
      locale,
      setLocale,
      t,
      isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider; 