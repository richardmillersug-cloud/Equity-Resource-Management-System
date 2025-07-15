import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// List of all supported locales
export const locales = ['en', 'lg']
export const defaultLocale = 'en'

// Get the preferred locale from cookie, header, or default
function getLocale(request: NextRequest) {
  // Check cookie first
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase()
    
    if (locales.includes(preferredLocale)) {
      return preferredLocale
    }
  }

  return defaultLocale
}

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /about, /blog/first-post)
  const pathname = request.nextUrl.pathname

  // Skip if the request is for static files, api routes, or already includes a locale
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('/images/') ||
    pathname.includes('.') ||
    locales.some(locale => pathname.startsWith(`/${locale}/`))
  ) {
    return NextResponse.next()
  }

  // Get the preferred locale
  const locale = getLocale(request)
  
  // Redirect to the localized path
  const newUrl = new URL(`/${locale}${pathname}`, request.url)
  // Copy all search params
  request.nextUrl.searchParams.forEach((value, key) => {
    newUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(newUrl)
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - static files (/_next/, /images/, etc.)
  // - api routes (/api/)
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)'],
} 