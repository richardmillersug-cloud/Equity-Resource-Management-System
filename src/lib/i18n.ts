import { appWithTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export { appWithTranslation, serverSideTranslations };

export const defaultNamespace = 'common';
export const namespaces = ['common'];

export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'lg'],
}; 