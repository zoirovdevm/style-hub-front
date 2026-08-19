import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { serverFetchGraphQL } from '@/lib/graphql/server-fetch';
import { GET_BEST_SELLERS_STR, GET_CATEGORIES_STR, GET_SITE_SETTINGS_STR } from '@/lib/graphql/server-queries';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';

const WHY_ICONS = [Sparkles, Truck, RotateCcw, ShieldCheck];

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = await getDictionary(locale);

  const [bestSellersData, categoriesData, siteSettingsData] = await Promise.all([
    serverFetchGraphQL<{ bestSellers: ProductCardData[] }>(GET_BEST_SELLERS_STR, { limit: 8 }).catch(() => ({
      bestSellers: [],
    })),
    serverFetchGraphQL<{ categories: any[] }>(GET_CATEGORIES_STR, undefined, 0).catch(() => ({ categories: [] })),
    // revalidate: 0 — an admin swapping the banner image should show up on
    // the next request, not wait out a stale cached page.
    serverFetchGraphQL<{ siteSettings: { heroImage?: string } }>(GET_SITE_SETTINGS_STR, undefined, 0).catch(() => ({
      siteSettings: {},
    })),
  ]);

  const bestSellers = bestSellersData.bestSellers ?? [];
  const categories = categoriesData.categories ?? [];
  // Relative path — it only ever ends up as an <img src> the browser
  // resolves, so it works via localhost or a tunnel URL without needing
  // NEXT_PUBLIC_API_URL (next.config.js rewrites /uploads/* to the backend).
  const heroImage = siteSettingsData.siteSettings?.heroImage || '/placeholder-product.svg';

  return (
    <div>
      {/* HERO */}
      {/* -mt-[68px]/pt-[68px] (and the sm: pair) cancel out <main>'s new
          top padding exactly, then re-add the same amount as the section's
          OWN padding — net effect: the visible content below is positioned
          exactly like before, but this section's dark background now
          extends all the way to the very top of the page, behind the
          floating (fixed) header, instead of stopping where <main> used to
          start. That's what lets the header's glass actually show the hero
          blurred through it instead of a plain mismatched background.
          data-navbar-contrast="dark" flags this section for
          useNavbarContrast (see Header.tsx) — it's unconditionally dark
          (bg-ink-950, no dark: pairing) even in light theme, so the
          floating header needs to know to switch to light text/icons
          while it's floating over this specific section, even though the
          rest of a light-theme page normally calls for dark text. */}
      <section
        data-navbar-contrast="dark"
        className="relative -mt-[68px] overflow-hidden bg-ink-950 pt-[68px] text-cream sm:-mt-[84px] sm:pt-[84px]"
      >
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl animate-float" />

        <div className="container-app relative flex min-h-[640px] flex-col justify-center py-24">
          <Reveal>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              {dict.home.heroEyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="max-w-2xl font-display text-5xl font-medium leading-tight sm:text-6xl lg:text-7xl">
              {dict.home.heroTitle}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-lg text-base text-cream/70">{dict.home.heroSubtitle}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={`/${locale}/shop`} className="btn-primary !bg-gold-500 !text-ink-950 hover:!bg-cream">
                {dict.home.shopNow}
                <ArrowRight size={16} />
              </Link>
              <Link href={`/${locale}/categories`} className="btn-outline !border-cream/20 !text-cream hover:!bg-cream hover:!text-ink-950">
                {dict.home.exploreCategories}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY US */}
      <section className="border-b border-ink-900/5 bg-white py-14 dark:border-cream/5 dark:bg-ink-950">
        <div className="container-app grid grid-cols-2 gap-8 lg:grid-cols-4">
          {dict.home.whyUsItems.map((item, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <Reveal key={item.title} delay={i * 0.08} className="flex flex-col items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950 text-gold-400 dark:bg-cream/10">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-semibold dark:text-cream">{item.title}</h3>
                <p className="text-xs text-ink-900/50">{item.desc}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* BEST SELLERS — shown before the category grid, per request: product
          cards should be the first thing shoppers see below the fold, with
          "shop by category" browsing further down as a secondary option. */}
      <section className="bg-white py-20 dark:bg-ink-950">
        <div className="container-app">
          <div className="flex items-end justify-between">
            <Reveal>
              <h2 className="section-title">{dict.home.bestSellers}</h2>
            </Reveal>
            <Link href={`/${locale}/shop`} className="hidden text-sm font-semibold text-ink-900/60 hover:text-ink-950 sm:flex items-center gap-1">
              {dict.home.shopNow} <ArrowRight size={14} />
            </Link>
          </div>

          {bestSellers.length === 0 ? (
            <p className="mt-10 text-sm text-ink-900/50">{dict.product.noResults}</p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {bestSellers.map((product, i) => (
                <Reveal key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="py-20">
          <div className="container-app">
            <Reveal>
              <h2 className="section-title">{dict.home.shopByCategory}</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((cat, i) => (
                <Reveal key={cat.id} delay={i * 0.05}>
                  <Link
                    href={`/${locale}/shop?category=${cat.slug}`}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-ink-900/5 bg-white p-5 text-center shadow-soft transition-transform hover:-translate-y-1 dark:border-cream/10 dark:bg-ink-800"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-lg font-display font-semibold text-ink-950 transition-colors group-hover:bg-gold-500">
                      {(locale === 'ru' && cat.nameRu ? cat.nameRu : cat.name)?.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold dark:text-cream">
                      {locale === 'ru' && cat.nameRu ? cat.nameRu : cat.name}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BANNER */}
      <section className="relative overflow-hidden bg-cream py-20 dark:bg-ink-800">
        <div className="container-app grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink-900/5">
              <Image src={heroImage} alt="Wardrobe" fill className="object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-600">{dict.home.newArrivals}</p>
            <h2 className="mt-4 font-display text-3xl font-medium sm:text-4xl dark:text-cream">{dict.home.heroTitle}</h2>
            <p className="mt-4 max-w-md text-sm text-ink-900/60">{dict.home.heroSubtitle}</p>
            <Link href={`/${locale}/shop`} className="btn-primary mt-8">
              {dict.home.shopNow}
              <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
