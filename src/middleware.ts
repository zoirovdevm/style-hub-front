import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

function getLocaleFromPath(pathname: string) {
  return locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const existingLocale = getLocaleFromPath(pathname);
  if (existingLocale) return NextResponse.next();

  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const preferred = acceptLanguage.toLowerCase().includes('ru') ? 'ru' : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
