import { cookies } from 'next/headers'

export const locales = ['en', 'lg'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export function getLocale(): Locale {
  const cookieStore = cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  return (localeCookie?.value as Locale) || defaultLocale
}

// Helper to generate paths with locale
export function localePath(path: string, locale?: Locale): string {
  const actualLocale = locale || getLocale()
  return `/${actualLocale}${path.startsWith('/') ? path : `/${path}`}`
} 