'use client';

import Link from 'next/link';
import { Facebook, Instagram, Send } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-900/5 bg-ink-950 text-cream ">
      <div className="container-app grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div
            className="font-display text-xl font-semibold uppercase"
            style={{ letterSpacing: '0.25em' }}
          >
            Wardrobe
          </div>
          <p className="mt-4 max-w-xs text-sm text-cream/60">{dict.home.heroSubtitle}</p>
          <div className="mt-6 flex gap-3">
            {[Facebook, Instagram, Send].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 transition-colors hover:border-gold-400 hover:text-gold-400"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-cream/50">{dict.footer.quickLinks}</h4>
          {/* prefetch={false} on every link in this footer: Next.js's
              viewport-prefetch trigger fires once a Link is within its
              rootMargin of the viewport, not only once fully visible — on a
              short homepage this footer qualifies soon after mount, well
              before a visitor has scrolled anywhere near it. Diagnostics on
              a real iPhone (perf overlay, LTE) caught these exact routes
              (/categories, /about, /contact, /orders, /profile) bursting as
              background fetches and stalling for 10-15s, competing with the
              actual page's own critical resources. Doesn't change what
              happens on tap. */}
          <div className="mt-4 flex flex-col gap-3 text-sm text-cream/70">
            <Link href={`/${locale}/shop`} prefetch={false}>{dict.nav.shop}</Link>
            <Link href={`/${locale}/categories`} prefetch={false}>{dict.nav.categories}</Link>
            <Link href={`/${locale}/about`} prefetch={false}>{dict.nav.about}</Link>
            <Link href={`/${locale}/contact`} prefetch={false}>{dict.nav.contact}</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-cream/50">{dict.footer.support}</h4>
          <div className="mt-4 flex flex-col gap-3 text-sm text-cream/70">
            <Link href={`/${locale}/orders`} prefetch={false}>{dict.nav.orders}</Link>
            <Link href={`/${locale}/profile`} prefetch={false}>{dict.nav.profile}</Link>
            <Link href={`/${locale}/contact`} prefetch={false}>{dict.contact.title}</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-cream/50">{dict.home.newsletterTitle}</h4>
          <p className="mt-4 text-sm text-cream/60">{dict.home.newsletterSubtitle}</p>
          <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full rounded-full border border-cream/15 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-cream/40 focus:border-gold-400"
            />
            <button className="shrink-0 rounded-full bg-gold-500 px-4 py-2.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400">
              {dict.home.subscribe}
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/40">
        © {year} Wardrobe — {dict.footer.rights}.
      </div>
    </footer>
  );
}
