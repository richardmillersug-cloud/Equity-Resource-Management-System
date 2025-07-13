'use client';

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const LanguageDebug: React.FC = () => {
  console.log('LanguageDebug component rendering...');
  
  try {
    const { locale, setLocale, t, isLoading } = useLanguage();
    
    console.log('Language Debug - Context values:', {
      locale,
      isLoading,
      tFunction: typeof t
    });

    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
        <h3 className="font-bold text-yellow-800 mb-2">Language Debug</h3>
        <div className="text-sm space-y-1">
          <p><strong>Current Locale:</strong> {locale}</p>
          <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Test Translation:</strong> {t('common.language', 'Language')}</p>
          <p><strong>Dashboard:</strong> {t('navigation.dashboard', 'Dashboard')}</p>
          <p><strong>Save:</strong> {t('actions.save', 'Save')}</p>
          
          <div className="mt-3 space-x-2">
            <button 
              onClick={() => setLocale('en')}
              className={`px-2 py-1 text-xs rounded ${locale === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLocale('lg')}
              className={`px-2 py-1 text-xs rounded ${locale === 'lg' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              LG
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('LanguageDebug Error:', error);
    
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
        <h3 className="font-bold text-red-800 mb-2">Language Debug Error</h3>
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
};

export default LanguageDebug; 