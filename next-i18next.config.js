module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'lg'],
    localeDetection: false,
  },
  defaultNS: 'common',
  fallbackLng: 'en',
  debug: process.env.NODE_ENV === 'development',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  
  // Use local resources
  use: [],
  
  // Static file paths
  localePath: './public/locales',
  
  // Namespace configuration
  ns: ['common'],
  
  // Interpolation options
  interpolation: {
    escapeValue: false,
  },
}; 