'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Heart, ShoppingBag, User2 } from 'lucide-react';
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

export function Header({ locale, dict }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const { data: cartData } = useQuery(GET_MY_CART, { skip: !user, fetchPolicy: 'cache-first' });
  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });

  const cartCount = cartData?.myCart?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
  const wishlistCount = wishlistData?.myWishlist?.length ?? 0;

  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/shop`, label: dict.nav.shop },
    { href: `/${locale}/categories`, label: dict.nav.categories },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink-900/5 bg-cream/80 backdrop-blur-md dark:border-cream/5 dark:bg-ink-950/80">
      <div className="container-app flex h-20 items-center justify-between">
        <Link href={`/${locale}`} className="font-display text-2xl font-semibold tracking-tight dark:text-cream">
          Style<span className="text-gold-500">Hub</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-900/70 transition-colors hover:text-ink-950 dark:text-cream/70 dark:hover:text-cream"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher locale={locale} />
          </div>

          <ThemeToggle label={{ light: dict.admin.themeToggleLight, dark: dict.admin.themeToggleDark }} />

          <Link
            href={`/${locale}/wishlist`}
            className="relative rounded-full p-2 text-ink-900 transition-colors hover:bg-ink-900/5 dark:text-cream dark:hover:bg-cream/10"
            aria-label={dict.nav.wishlist}
          >
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href={`/${locale}/cart`}
            className="relative rounded-full p-2 text-ink-900 transition-colors hover:bg-ink-900/5 dark:text-cream dark:hover:bg-cream/10"
            aria-label={dict.nav.cart}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {user.role === 'ADMIN' && (
                <Link href={`/${locale}/admin`} className="btn-outline !px-4 !py-2 text-xs">
                  {dict.nav.admin}
                </Link>
              )}
              <Link
                href={`/${locale}/profile`}
                className="flex items-center gap-2 rounded-full p-2 text-ink-900 transition-colors hover:bg-ink-900/5 dark:text-cream dark:hover:bg-cream/10"
              >
                <User2 size={20} />
              </Link>
              <button onClick={clearSession} className="text-xs font-semibold text-ink-900/60 hover:text-ink-950 dark:text-cream/60 dark:hover:text-cream">
                {dict.nav.logout}
              </button>
            </div>
          ) : (
            <Link href={`/${locale}/login`} className="btn-primary hidden !px-5 !py-2.5 text-xs sm:inline-flex">
              {dict.nav.login}
            </Link>
          )}

          <button
            className="rounded-full p-2 text-ink-900 hover:bg-ink-900/5 dark:text-cream dark:hover:bg-cream/10 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-ink-900/5 bg-cream lg:hidden dark:border-cream/5 dark:bg-ink-950"
          >
            <div className="container-app flex flex-col gap-4 py-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium dark:text-cream"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <LanguageSwitcher locale={locale} />
                  <ThemeToggle label={{ light: dict.admin.themeToggleLight, dark: dict.admin.themeToggleDark }} />
                </div>
                {user ? (
                  <button onClick={clearSession} className="text-sm font-semibold dark:text-cream">
                    {dict.nav.logout}
                  </button>
                ) : (
                  <Link href={`/${locale}/login`} className="btn-primary !px-5 !py-2.5 text-xs">
                    {dict.nav.login}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
