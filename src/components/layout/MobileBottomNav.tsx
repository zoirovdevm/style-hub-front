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
        // Same fix as Header.tsx: dark:bg-white/10 was too transparent —
        // a light patch scrolling underneath in dark theme washed out both
        // the pill and the cream tab labels together. A more opaque,
        // near-black glass keeps it legible no matter what's behind it.
        //
        // Per follow-up request, the light-theme default and "floating over
        // a dark hero" states had the same problem on mobile — this bar
        // sits directly over product photos/dark banners, and at 45%/35%
        // opacity the content behind it visually merged with the tab
        // labels. Bumped both to a much more opaque glass (85% / 78%,
        // matching the dark-theme pill's own 72% for consistency). Blur
        // bumped up again too per follow-up "more blur" request (was
        // 40px/24px, same change as Header.tsx).
        // Same blur-radius reduction as Header.tsx (64px/56px -> 20px) —
        // see the comment there. This nav is fixed + always mounted too,
        // so it pays the same per-frame WebKit backdrop-filter cost on iOS.
        className={`mx-auto grid max-w-md grid-cols-5 rounded-full border px-1 backdrop-blur-[20px] backdrop-saturate-200 dark:border-white/10 dark:bg-[rgba(14,20,16,0.72)] dark:backdrop-blur-[20px] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] ${
          overDark
            ? 'navbar-on-dark border-white/15 bg-[rgba(20,20,20,0.78)] shadow-[0_8px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]'
            : 'border-black/10 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)]'
        }`}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
