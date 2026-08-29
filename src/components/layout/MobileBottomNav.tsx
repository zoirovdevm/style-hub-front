'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { Home, LayoutGrid, ShoppingBag, Heart, User2 } from 'lucide-react';
import { GET_MY_CART, GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { useNavbarContrast } from '@/lib/hooks/use-navbar-contrast';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

interface MobileBottomNavProps {
  locale: Locale;
  dict: Dictionary;
}

// A fixed bottom tab bar for small screens — the kind shoppers on
// marketplace apps (Uzum, etc.) expect: quick one-thumb access to catalog,
// cart, wishlist, and account, instead of hiding everything behind a
// hamburger menu. Hidden on lg+ where the full top nav already covers this.
export function MobileBottomNav({ locale, dict }: MobileBottomNavProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const { data: cartData } = useQuery(GET_MY_CART, { skip: !user, fetchPolicy: 'cache-first' });
  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });

  const cartCount = cartData?.myCart?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
  const wishlistCount = wishlistData?.myWishlist?.length ?? 0;

  // Probe near where this pill actually sits — window.innerHeight isn't
  // known until the browser runs, so this is a function (re-evaluated on
  // every scroll/resize check) rather than a plain number. 60px up from
  // the bottom comfortably lands inside the pill regardless of the exact
  // safe-area inset on a given device.
  const overDark = useNavbarContrast(() => (typeof window === 'undefined' ? 0 : window.innerHeight - 60));

  // The last tab always points to /profile and always reads "Profil" now —
  // it used to switch to an explicit "Kirish" (Login) tab for guests, but
  // that put a Login button in the responsive/mobile nav that looked out
  // of place next to the icon-only tabs. Tapping "Profil" as a guest still
  // gets you to a working login flow: the profile page itself already
  // shows a "please log in" prompt with its own Login button when there's
  // no user (see profile/page.tsx) — nothing is actually unreachable, the
  // bottom nav just no longer has to say "Kirish" out loud.
  const items = [
    { href: `/${locale}`, label: dict.nav.home, icon: Home },
    { href: `/${locale}/shop`, label: dict.nav.shop, icon: LayoutGrid },
    { href: `/${locale}/cart`, label: dict.nav.cart, icon: ShoppingBag, count: cartCount },
    { href: `/${locale}/wishlist`, label: dict.nav.wishlist, icon: Heart, count: wishlistCount },
    { href: `/${locale}/profile`, label: dict.nav.profile, icon: User2 },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname?.startsWith(href);
  }

  // The admin panel has its own sidebar navigation (products/orders/
  // categories) — a shopper-facing tab bar (cart/wishlist/etc.) doesn't
  // belong on top of it.
  if (pathname?.startsWith(`/${locale}/admin`)) return null;

  return (
    // Floats above the page instead of sitting flush against the bottom
    // edge (inset-x-3 + the calc() bottom offset), same iOS-glass language
    // as the top Header: rounded pill, semi-transparent blurred surface,
    // soft shadow. The old version sat flush at bottom-0 with its own
    // paddingBottom to clear the iPhone home-indicator safe area — that
    // padding is now added to the floating offset itself instead, so the
    // whole pill (not just its bottom padding) lifts clear of the safe area.
    <nav
      className="fixed inset-x-3 z-50 lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div
        // ROOT-CAUSE FIX — backdrop-blur removed entirely (per explicit
        // request; see Header.tsx for the full investigation notes). A
        // staged isolation test confirmed the ~30s iOS stall comes from a
        // fixed, backdrop-blurred pill sitting near Hero's negative-margin
        // bleed trick, which extends Hero's colored glow blobs up behind
        // the top header — this bottom nav paid the identical per-frame
        // WebKit backdrop-filter cost just from being fixed + blurred.
        // A GPU-layer-promotion mitigation (transform-gpu) was tried
        // first; this instead removes the backdrop-filter cost outright.
        // Now a plain, solid/near-solid background instead of "see-through
        // glass" — opacity bumped up (was 45-85%, now 94-96%) so it still
        // reads as one solid tab bar without a blur to soften what's
        // showing through. Box-shadow simplified to Tailwind's built-in
        // `shadow-lg` instead of a custom two-layer inset shadow.
        className={`mx-auto grid max-w-md grid-cols-5 rounded-full border px-1 shadow-lg dark:border-white/10 dark:bg-[rgba(14,20,16,0.94)] ${
          overDark
            ? 'navbar-on-dark border-white/15 bg-[rgba(20,20,20,0.94)]'
            : 'border-black/10 bg-white/96'
        }`}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              // This bar is `fixed` + always mounted, so its 5 links are
              // "visible" from the very first frame on every page — Next.js's
              // default prefetch fires background fetches for all of them
              // immediately, right when the connection is most strained
              // during initial load. Diagnostics on a real failing iPhone
              // (perf overlay) showed these exact routes bursting together
              // and stalling for 10-15s on degraded LTE — this doesn't change
              // what happens on tap, only removes the unrequested background
              // fetch.
              prefetch={false}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-gold-600 dark:text-gold-400' : 'text-ink-900/45 dark:text-cream/45'
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {!!item.count && item.count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-ink-950">
                    {item.count}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
