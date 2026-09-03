'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Heart, ShoppingBag, User2, LogIn } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { GET_MY_CART, GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

// Har bir nav link — "Erkaklar"/"Ayollar" ikkalasi ham /shop'ga o'zining
// ?gender= qiymati bilan yo'naltiradi (genderValue), qolgan barcha havolalar
// oddiy sahifalar (genderValue: null). Bitta joyda saqlanadi — shu ro'yxatni
// ham asosiy (useSearchParams'li) versiya, ham quyidagi Suspense fallback
// ishlatadi, shunda ikkalasi bir-biridan farq qilib ketmaydi.
function buildNavLinks(locale: Locale, dict: Dictionary) {
  return [
    { href: `/${locale}`, label: dict.nav.home, genderValue: null as string | null },
    { href: `/${locale}/shop`, label: dict.nav.shop, genderValue: null },
    { href: `/${locale}/shop?gender=MALE`, label: dict.nav.men, genderValue: 'MALE' },
    { href: `/${locale}/shop?gender=FEMALE`, label: dict.nav.women, genderValue: 'FEMALE' },
    { href: `/${locale}/categories`, label: dict.nav.categories, genderValue: null },
    { href: `/${locale}/about`, label: dict.nav.about, genderValue: null },
    { href: `/${locale}/contact`, label: dict.nav.contact, genderValue: null },
  ];
}

function navLinkClassName(active: boolean) {
  return `relative py-1 text-sm font-medium transition-colors ${
    active
      ? 'font-semibold text-gold-600 dark:text-gold-400'
      : 'text-ink-900/70 hover:text-ink-950 dark:text-cream/70 dark:hover:text-cream'
  }`;
}

// "Do'kon" sahifasi endi 3 xil holatda faol bo'lishi mumkin: oddiy /shop,
// yoki ?gender=MALE/FEMALE bilan — shuning uchun faqat pathname'ga qarab
// bo'lmaydi, aks holda "Do'kon", "Erkaklar" va "Ayollar" barchasi bir vaqtda
// yorishib ketardi. `activeGender` — hozirgi URL'dagi ?gender qiymati
// (Erkaklar/Ayollar sahifalarida useSearchParams orqali olinadi; boshqa
// sahifalarda har doim null bo'lgani uchun oddiy pathname solishtiruvi
// yetarli).
function isLinkActive(
  link: { href: string; genderValue: string | null },
  locale: Locale,
  pathname: string | null,
  activeGender: string | null,
) {
  const isShopRoute = pathname === `/${locale}/shop` || (pathname?.startsWith(`/${locale}/shop/`) ?? false);
  if (link.genderValue) return isShopRoute && activeGender === link.genderValue;
  if (link.href === `/${locale}/shop`) return isShopRoute && !activeGender;
  if (link.href === `/${locale}`) return pathname === link.href;
  return pathname === link.href || (pathname?.startsWith(`${link.href}/`) ?? false);
}

// useSearchParams() qism — Next.js buni Suspense chegarasi ichida talab
// qiladi, aks holda butun sahifa statik generatsiyadan chiqib ketadi.
// Header saytning har bir sahifasida ko'rinadigani uchun bu talabni FAQAT
// shu kichik nav qismiga (butun Header'ga emas) cheklab qo'yamiz — pastdagi
// <Suspense fallback={<StaticNavLinks />}> shuni ta'minlaydi.
function DynamicNavLinks({ locale, dict, pathname }: { locale: Locale; dict: Dictionary; pathname: string | null }) {
  const searchParams = useSearchParams();
  const activeGender = searchParams.get('gender');
  const navLinks = buildNavLinks(locale, dict);

  return (
    <>
      {navLinks.map((link) => {
        const active = isLinkActive(link, locale, pathname, activeGender);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            className={navLinkClassName(active)}
          >
            {link.label}
            {active && <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gold-500" />}
          </Link>
        );
      })}
    </>
  );
}

// Suspense fallback — gender query hali "ko'rinmaydi" (useSearchParams yo'q),
// shuning uchun Erkaklar/Ayollar oddiy (faol bo'lmagan) holatda chiqadi.
// Amalda bu faqat ilk server-render/hydratsiya oralig'ida ko'rinadi.
function StaticNavLinks({ locale, dict, pathname }: { locale: Locale; dict: Dictionary; pathname: string | null }) {
  const navLinks = buildNavLinks(locale, dict);
  return (
    <>
      {navLinks.map((link) => {
        const active = isLinkActive(link, locale, pathname, null);
        return (
          <Link key={link.href} href={link.href} prefetch={false} className={navLinkClassName(active)}>
            {link.label}
            {active && <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gold-500" />}
          </Link>
        );
      })}
    </>
  );
}

// On mobile, MobileBottomNav (Home/Shop/Cart/Wishlist/Profile) already
// covers primary navigation, and the Profile page carries the secondary
// stuff (language, theme, admin link, logout) — so this header no longer
// needs its own hamburger/dropdown menu on small screens. Everything below
// that's `lg:`-gated only shows once there's room for the full desktop nav.
export function Header({ locale, dict }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  const { data: cartData } = useQuery(GET_MY_CART, { skip: !user, fetchPolicy: 'cache-first' });
  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });

  const cartCount = cartData?.myCart?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
  const wishlistCount = wishlistData?.myWishlist?.length ?? 0;

  // Per explicit request, this pill's colors now follow the SITE THEME
  // only (Tailwind's `dark:` variant, tied to the `.dark` class on <html>)
  // — light theme = white bg + ink text, dark theme = black bg + cream
  // text — not the old JS-driven "what's actually behind the pill right
  // now" contrast switch (useNavbarContrast), which is no longer called
  // here. Every nav item below already carries its own `dark:text-cream`-
  // style pairing, so theme changes propagate automatically with no JS.
  // The nav items themselves (incl. the "Erkaklar"/"Ayollar" gender links
  // and their active-state logic) live in DynamicNavLinks/StaticNavLinks
  // above — see the comment there for why.

  return (
    // `fixed` (not `sticky`) — this floats the pill ON TOP of the page
    // instead of reserving its own space in the document flow. That
    // matters because with `sticky`, the pt-3/pt-4 gap above the pill was
    // still part of the *header's own box*, so it showed the plain <body>
    // background — visibly wrong on the homepage, where a solid-dark hero
    // (bg-ink-950, always dark regardless of theme) starts right below:
    // the gap looked like a mismatched light strip glued above the bar.
    // With `fixed`, that gap instead shows whatever's actually at the top
    // of the page underneath (the hero's own dark background, blurred
    // through the glass), which is what real "floating over content" looks
    // like. See layout.tsx (<main> padding) and page.tsx (hero's negative
    // margin) for the other half of this — since a fixed header no longer
    // pushes page content down on its own, something else has to.
    <header className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-4">
      <div className="container-app">
        <div
          // Per explicit follow-up request: LIGHT mode is now fully solid
          // white (bg-white, no opacity fraction) with blur turned OFF
          // entirely — no backdrop-filter cost at all in light mode, so
          // this is strictly safer for iOS than the previous 92%/8px-blur
          // version. DARK mode is untouched from the prior explicit theme
          // spec (black bg + cream text, light 8px backdrop-blur) since
          // that spec was never contradicted — only light mode was called
          // out. transform-gpu + will-change-transform stay as the
          // GPU-layer mitigation for the blur that still exists in dark
          // mode; re-verify dark mode on real iOS Safari after deploying.
          className="transform-gpu will-change-transform flex h-14 items-center justify-between gap-2 rounded-full border border-black/10 bg-white px-4 shadow-lg transition-colors duration-300 sm:h-[68px] sm:px-6 dark:border-white/10 dark:bg-[rgba(10,10,12,0.92)] dark:backdrop-blur-[8px]"
        >
        <Link
          href={`/${locale}`}
          // Header is `fixed` + always mounted (every page, every screen
          // size), so this — and every other Link below — is "visible" from
          // frame one and would otherwise background-prefetch immediately,
          // adding load exactly when a strained mobile connection can least
          // afford it. See the matching comment in MobileBottomNav.tsx for
          // the on-device evidence; doesn't change what happens on tap.
          prefetch={false}
          className="min-w-0 shrink-0 truncate font-display text-base font-semibold uppercase text-ink-950 dark:text-cream sm:text-xl"
          style={{ letterSpacing: '0.2em' }}
        >
          Wardrobe
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <Suspense fallback={<StaticNavLinks locale={locale} dict={dict} pathname={pathname} />}>
            <DynamicNavLinks locale={locale} dict={dict} pathname={pathname} />
          </Suspense>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LanguageSwitcher locale={locale} />

          <ThemeToggle label={{ light: dict.admin.themeToggleLight, dark: dict.admin.themeToggleDark }} />

          <Link
            href={`/${locale}/wishlist`}
            prefetch={false}
            className="group relative hidden rounded-full p-2 text-ink-900 transition-colors hover:bg-ink-900/5 lg:block dark:text-cream dark:hover:bg-cream/10"
            aria-label={dict.nav.wishlist}
          >
            {/* fill-red-500 as a CSS class (not the `fill` prop) so it only
                kicks in on hover, previewing "add to wishlist" — same
                treatment as the wishlist button on product cards. */}
            <Heart size={20} className="transition-colors group-hover:fill-red-500 group-hover:stroke-red-500" />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href={`/${locale}/cart`}
            prefetch={false}
            className="relative hidden rounded-full p-2 text-ink-900 transition-colors hover:bg-ink-900/5 lg:block dark:text-cream dark:hover:bg-cream/10"
            aria-label={dict.nav.cart}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Single link, logged in or not — its href/icon/label just switch
              based on auth state (guest -> Login, logged in -> Profile).
              Deliberately still ONE element (not a separate Login button
              conditionally rendered alongside a Profile button) — an
              earlier version had two separate buttons here and that tripped
              a bug in some in-app browsers (Telegram's built-in one,
              confirmed by a screenshot) that misreport their viewport width
              as desktop-sized: it fooled the `lg:` breakpoint into showing
              ONLY the guest button on an actual phone screen, while every
              other lg-gated item stayed correctly hidden — visually broken
              and inconsistent. Keeping it as one link that just changes its
              content avoids that whole failure mode. */}
          <div className="hidden items-center gap-2 lg:flex">
            {user?.role === 'ADMIN' && (
              <Link href={`/${locale}/admin`} prefetch={false} className="btn-outline !px-4 !py-2 text-xs">
                {dict.nav.admin}
              </Link>
            )}
            <Link
              href={`/${locale}/${user ? 'profile' : 'login'}`}
              prefetch={false}
              className="flex items-center gap-1.5 rounded-full py-2 pl-2 pr-3 text-ink-900 transition-colors hover:bg-ink-900/5 dark:text-cream dark:hover:bg-cream/10"
            >
              {user ? <User2 size={20} /> : <LogIn size={20} />}
              <span className="text-xs font-semibold">{user ? dict.nav.profile : dict.nav.login}</span>
            </Link>
          </div>
        </div>
        </div>
      </div>
    </header>
  );
}
