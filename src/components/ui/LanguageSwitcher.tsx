'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Language options
  const languages = [
    { code: 'en' as const, name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'lg' as const, name: 'Luganda', nativeName: 'Oluganda', flag: '🇺🇬' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: 'en' | 'lg') => {
    setLocale(newLocale);
    setIsLanguageOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsLanguageOpen(!isLanguageOpen)}
        className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm text-gray-600">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLanguageOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isLanguageOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                locale === lang.code ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.name}</div>
                <div className="text-xs text-gray-500">{lang.nativeName}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 