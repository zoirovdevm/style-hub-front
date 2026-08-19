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
    // GraphQL/upload/uploads/presence are backend endpoints proxied by
    // next.config.js rewrites, not locale-prefixed pages — without this
    // exclusion this middleware redirected e.g. POST /graphql to
    // /ru/graphql (no page there, no matching rewrite either), which
    // 404'd every GraphQL request, breaking login and everything else on
    // the site. /presence hit this exact same bug: it was added to
    // next.config.js's rewrites later but never added here, so every
    // heartbeat/online-count call was redirected to /uz/presence/... or
    // /ru/presence/... — which no rewrite matches — and 404'd.
    pathname.startsWith('/graphql') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/presence') ||
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
  matcher: ['/((?!_next|api|graphql|upload|presence|.*\\..*).*)'],
};
