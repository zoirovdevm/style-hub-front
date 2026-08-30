'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, ShoppingBag, User2, LogIn } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { GET_MY_CART, GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { useNavbarContrast } from '@/lib/hooks/use-navbar-contrast';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
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

  // Probe near the vertical middle of the pill's own band (roughly 30-40px
  // from the very top, comfortably inside both the mobile h-14+pt-3 and
  // desktop h-[68px]+pt-4 sizes) — see use-navbar-contrast.ts for why this
  // is needed at all (light theme + an unconditionally-dark hero).
  const overDark = useNavbarContrast(() => 40);

  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/shop`, label: dict.nav.shop },
    { href: `/${locale}/categories`, label: dict.nav.categories },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  // Home ("/uz") must match exactly — every other route also starts with
  // "/uz", so a prefix check there would keep Home permanently highlighted.
  // Every other link matches its own page and anything nested under it
  // (e.g. "/uz/shop/some-product" still highlights "Shop").
  function isActiveLink(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  }

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
          // Per follow-up request: bring a LIGHT glassmorphism blur back on
          // this pill specifically (opacity was 94-96%, now pushed even
          // higher, 96-97%, so it reads as solid/legible first and glassy
          // second). IMPORTANT CONTEXT for whoever touches this next: the
          // reason backdrop-blur was removed entirely a moment ago is that
          // it (everywhere on the site, not just here) caused a ~30s iOS
          // Safari stall on first load — confirmed by removing ALL blur
          // site-wide and having the user verify iOS + Chrome both became
          // fully fast. This reintroduces backdrop-blur ONLY on this fixed
          // pill (and MobileBottomNav's), kept deliberately light (10px,
          // was 20px) and with NO backdrop-saturate (that rode along
          // before and adds its own compositing cost on top of the blur),
          // plus transform-gpu + will-change-transform to promote this
          // pill to its own GPU compositor layer — the standard mitigation
          // for iOS backdrop-filter jank on a `fixed` element. This is a
          // deliberate, requested trade-off, not a full revert: MUST be
          // re-verified on real iOS Safari (fully quit + reopen, fresh
          // load) after deploying — if the stall comes back, the fix is to
          // drop the blur radius further or remove it again, not to
          // reach for a heavier GPU hack.
          className={`transform-gpu will-change-transform flex h-14 items-center justify-between gap-2 rounded-full border px-4 shadow-lg backdrop-blur-[10px] transition-colors duration-300 sm:h-[68px] sm:px-6 dark:border-white/10 dark:bg-[rgba(14,20,16,0.96)] ${
            overDark
              ? 'navbar-on-dark border-white/15 bg-[rgba(20,20,20,0.96)]'
              : 'border-black/10 bg-white/97'
          }`}
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
          {navLinks.map((link) => {
            const active = isActiveLink(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1 text-sm font-medium transition-colors ${
                  active
                    ? 'font-semibold text-gold-600 dark:text-gold-400'
                    : 'text-ink-900/70 hover:text-ink-950 dark:text-cream/70 dark:hover:text-cream'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gold-500" />
                )}
              </Link>
            );
          })}
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
